import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { processInboundWhatsAppMessage } from '@/lib/whatsapp/inboundProcessor'

export const dynamic = 'force-dynamic'

/**
 * POST https://artemis4.com.br/api/public/evolution/webhook?token={evolution_webhook_secret}
 *
 * Adaptador FINO da Evolution API (WhatsApp Business) — só autentica a requisição e normaliza
 * o payload específico da Evolution. Toda a lógica de negócio (atribuição de CTA/campanha,
 * criação de lead no CRM, ligação com a Mensageria) vive em processInboundWhatsAppMessage
 * (src/lib/whatsapp/inboundProcessor.ts), agnóstica de provider — pra plugar outro provider
 * (ex.: Meta WhatsApp Cloud API oficial) no futuro, basta escrever outro adaptador fino igual
 * a este chamando a mesma função. Ver docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md §9.3.
 *
 * Recebe eventos MESSAGES_UPSERT da Evolution API. Quando a mensagem contém [ref:xxx] (campanha
 * real desta plataforma ou mecanismo de CTA externo), a atribuição é resolvida automaticamente.
 * Sem [ref:], o lead nasce como WhatsApp orgânico.
 *
 * Autenticação: query param ?token= mapeia para tenants.evolution_webhook_secret
 *               (ou clientes.evolution_webhook_secret, se o cliente tiver número próprio —
 *               seção 14.9 do plano) + verifica se payload.instance bate com a instância
 *               configurada em quem o token identificou.
 */
export async function POST(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token')
  if (!token) return NextResponse.json({ ok: false, error: 'token ausente' }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }

  // 1. Verificar se é um evento de mensagem chegando
  const event: string = body?.event || ''
  if (!event.includes('messages') && event !== 'MESSAGES_UPSERT') {
    // Ignorar outros eventos (connection.update, qr.updated, etc.) silenciosamente
    return NextResponse.json({ ok: true, ignored: true })
  }

  // 2. Identificar tenant (e opcionalmente cliente) pelo token + instância. Checa primeiro
  // clientes.evolution_webhook_secret (mais específico — cliente com WhatsApp próprio); se
  // não bater, cai para tenants.evolution_webhook_secret (número principal, comportamento
  // original). Ver PLANO_MENSAGERIA.md seção 14.9.
  const instance: string = body?.instance || ''
  let tenant: { id: string; slug: string; evolution_instance: string | null }
  let ownerClientId: string | null = null

  const { rows: clientMatchRows } = await pool.query(
    `SELECT c.uuid AS client_id, c.tenant_id, c.evolution_instance, t.slug AS tenant_slug
       FROM public.clientes c
       JOIN public.tenants t ON t.id = c.tenant_id
      WHERE c.evolution_webhook_secret = $1 AND t.status = 'active' LIMIT 1`,
    [token],
  )
  if (clientMatchRows[0]) {
    const cm = clientMatchRows[0]
    tenant = { id: cm.tenant_id, slug: cm.tenant_slug, evolution_instance: cm.evolution_instance }
    ownerClientId = cm.client_id
  } else {
    const { rows: tenantRows } = await pool.query(
      `SELECT id, slug, evolution_instance FROM public.tenants
        WHERE evolution_webhook_secret = $1 AND status = 'active' LIMIT 1`,
      [token],
    )
    if (!tenantRows[0]) return NextResponse.json({ ok: false, error: 'token inválido' }, { status: 401 })
    tenant = tenantRows[0]
  }

  // Verificação secundária: instância bate com a configurada em quem o token identificou
  if (tenant.evolution_instance && instance && tenant.evolution_instance !== instance) {
    return NextResponse.json({ ok: false, error: 'instância não corresponde' }, { status: 403 })
  }

  // 3. Extrair dados da mensagem (formato específico da Evolution API)
  // Evolution v2 pode mandar array em data ou objeto único
  const entries: any[] = Array.isArray(body?.data) ? body.data : body?.data ? [body.data] : []
  if (entries.length === 0) return NextResponse.json({ ok: true, ignored: true })

  for (const entry of entries) {
    // Ignorar mensagens enviadas pelo próprio sistema
    if (entry?.key?.fromMe === true) continue

    const remoteJid: string = entry?.key?.remoteJid || ''
    if (!remoteJid || remoteJid.includes('@g.us')) continue // ignorar grupos

    // Extrair número limpo: "5511999998888@s.whatsapp.net" → "5511999998888"
    const phone = remoteJid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/\D/g, '')
    const pushName: string | null = entry?.pushName || null

    // Extrair texto da mensagem (suporta conversation, extendedText, imageCaption)
    const msgText: string =
      entry?.message?.conversation ||
      entry?.message?.extendedTextMessage?.text ||
      entry?.message?.imageMessage?.caption ||
      entry?.message?.videoMessage?.caption ||
      entry?.message?.documentMessage?.caption ||
      ''

    if (!msgText && !phone) continue

    // 4. Normaliza e delega toda a lógica de negócio (atribuição + lead + Mensageria) pro
    // processador agnóstico de provider.
    await processInboundWhatsAppMessage({
      tenantId: tenant.id,
      ownerClientId,
      phone,
      pushName,
      text: msgText || null,
      externalMessageId: entry?.key?.id ?? null,
    }).catch((err) => {
      console.error('[evolution-webhook] processInboundWhatsAppMessage falhou:', err)
    })
  }

  // Evolution espera resposta rápida (< 5s)
  return NextResponse.json({ ok: true })
}

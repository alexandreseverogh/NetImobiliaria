import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { enqueueEvolutionEvent, drainWebhookInbox } from '@/lib/mensageria/webhookInbox'

export const dynamic = 'force-dynamic'

/**
 * POST https://artemis4.com.br/api/public/evolution/webhook?token={evolution_webhook_secret}
 *
 * Adaptador da Evolution API (WhatsApp). Desde a fila durável (mensageria.webhook_inbox):
 *   1. autentica o token e confirma a instância;
 *   2. GRAVA o payload bruto na fila e responde 200 em milissegundos;
 *   3. dispara o drenador em segundo plano (caminho rápido). Se o processo cair ou falhar, o cron
 *      /api/cron/mensageria/webhook-drain processa depois. Nenhuma mensagem é descartada por
 *      lentidão ou falha de processamento.
 *
 * O processamento de negócio (atribuição de CTA, lead no CRM, Mensageria) fica em
 * src/lib/whatsapp/evolutionEventProcessor.ts. Ver docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md §9.3.
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

  // Eventos que não são de mensagem/contato (connection.update, qr.updated...) são ignorados.
  const event: string = body?.event || ''
  const isContactsEvent = event.toLowerCase().includes('contacts')
  if (!event.includes('messages') && event !== 'MESSAGES_UPSERT' && !isContactsEvent) {
    return NextResponse.json({ ok: true, ignored: true })
  }

  // Identificar tenant (e opcionalmente cliente) pelo token. Checa primeiro
  // clientes.evolution_webhook_secret (cliente com WhatsApp próprio); senão tenants.
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

  const entries: any[] = Array.isArray(body?.data) ? body.data : body?.data ? [body.data] : []
  if (entries.length === 0) return NextResponse.json({ ok: true, ignored: true })

  // Grava antes de qualquer processamento. Se a gravação falhar, responde 500: a Evolution
  // reenvia, e nada se perde.
  try {
    const queued = await enqueueEvolutionEvent({ tenantId: tenant.id, ownerClientId, body })
    // Caminho rápido, em segundo plano. Não bloqueia a resposta e não pode derrubar o webhook.
    drainWebhookInbox({ batch: 5 }).catch((err) =>
      console.error('[evolution-webhook] drenagem em segundo plano falhou (o cron cobre):', err),
    )
    return NextResponse.json({ ok: true, queued: true, duplicate: queued.duplicate })
  } catch (err) {
    console.error('[evolution-webhook] falha ao gravar na fila:', err)
    return NextResponse.json({ ok: false, error: 'falha ao gravar evento' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { processInboundWhatsAppMessage } from '@/lib/whatsapp/inboundProcessor'
import { ingestMessage } from '@/lib/mensageria/ingest'
import { resolveWhatsAppInbox } from '@/lib/mensageria/inboxes'
import { buildInboundMedia, type InboundMedia } from '@/lib/mensageria/inboundMedia'
import { uploadToS3 } from '@/lib/storage/s3-client'
import axios from 'axios'

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
/**
 * Registra uma mensagem que o PRÓPRIO tenant enviou pelo celular conectado (fromMe=true).
 * Grava como outbound na conversa do destinatário (contato externo). NÃO cria lead nem
 * atribuição: lead nasce só de mensagem de contato externo (inboundProcessor).
 */
async function recordOutboundFromTenant(input: {
  tenantId: string
  phone: string
  name: string | null
  avatarUrl?: string | null
  text: string
  media?: InboundMedia | null
  externalMessageId: string | null
}): Promise<void> {
  try {
    const inboxId = await resolveWhatsAppInbox(input.tenantId, null)
    const r = await ingestMessage({
      tenantId: input.tenantId,
      inboxId,
      contact: { phone: input.phone, name: input.name, avatarUrl: input.avatarUrl ?? null },
      direction: 'outbound',
      senderType: 'system',
      content: input.media ? input.media.content : input.text,
      contentType: input.media?.contentType ?? 'text',
      attachments: input.media?.attachments ?? [],
      externalId: input.externalMessageId,
    })
    // Resposta enviada por você também entra na linha do tempo do lead, se o contato tiver um.
    const { rows: lead } = await pool.query(
      `SELECT lead_uuid FROM mensageria.contacts WHERE id = $1 AND lead_uuid IS NOT NULL`,
      [r.contactId],
    )
    if (lead[0]?.lead_uuid && r.messageId) {
      await pool.query(
        `INSERT INTO public.lead_timeline (tenant_id, lead_uuid, tipo_origem, origem_id, occurred_at)
         VALUES ($1, $2, 'mensageria_message', $3, now())
         ON CONFLICT (tipo_origem, origem_id) DO NOTHING`,
        [input.tenantId, lead[0].lead_uuid, r.messageId],
      )
    }
  } catch (err) {
    console.error('[webhook] falha ao registrar outbound do tenant (não bloqueante):', err)
  }
}


/**
 * Resolve o telefone real do contato. Com Baileys 7.x (Evolution rc14), mensagens de contatos
 * multi-device chegam com remoteJid "@lid" mas trazem remoteJidAlt com o número real
 * ("5581...@s.whatsapp.net"). Se nenhum número real vier, devolve o próprio identificador.
 */
/**
 * Celular brasileiro: o WhatsApp às vezes endereça no formato antigo de 12 dígitos
 * (55 + DDD + 8 dígitos). O formato atual tem 9 após o DDD (13 dígitos). Só acrescenta o 9
 * quando o assinante começa com 6-9 (celular); fixos (2-5) ficam como estão.
 */
function normalizeBrMobile(phone: string): string {
  if (phone.length === 12 && phone.startsWith('55') && /^[6-9]/.test(phone.slice(4))) {
    return phone.slice(0, 4) + '9' + phone.slice(4)
  }
  return phone
}

/** Nome e foto de perfil guardados para este número (vindos dos eventos de contato da Evolution). */
async function getContactProfile(tenantId: string, phone: string): Promise<{ name: string | null; avatarUrl: string | null }> {
  const { rows } = await pool.query(
    `SELECT name, avatar_url FROM mensageria.contact_profiles WHERE tenant_id = $1 AND phone = $2 LIMIT 1`,
    [tenantId, phone],
  )
  return { name: rows[0]?.name ?? null, avatarUrl: rows[0]?.avatar_url ?? null }
}

/**
 * Baixa a foto de perfil do WhatsApp e guarda no nosso armazenamento (o link original expira).
 * Falha não bloqueia nada: sem foto, o avatar segue com as iniciais.
 */
async function storeAvatar(tenantId: string, phone: string, sourceUrl: string): Promise<string | null> {
  try {
    const res = await axios.get(sourceUrl, { responseType: 'arraybuffer', timeout: 15000 })
    const buffer = Buffer.from(res.data)
    const mime: string = String(res.headers?.['content-type'] || 'image/jpeg')
    const uploaded = await uploadToS3(`mensageria/avatars/${tenantId}/${phone}.jpg`, buffer, mime)
    return uploaded?.url ?? null
  } catch (err) {
    console.error('[evolution-webhook] falha ao guardar foto de perfil:', err)
    return null
  }
}

/**
 * Eventos de contato (upsert/update): guardam o nome e a foto de perfil do WhatsApp. Só atualiza
 * contatos existentes e grava o perfil para os próximos. Nunca cria contato a partir de evento de contato.
 */
async function applyContactEvent(tenantId: string, entries: any[]) {
  for (const e of entries) {
    const jid: string = e?.remoteJid || e?.id || ''
    if (!jid.endsWith('@s.whatsapp.net') && !jid.endsWith('@c.us')) continue
    const phone = normalizeBrMobile(jid.replace(/@(s\.whatsapp\.net|c\.us)$/, '').replace(/\D/g, ''))
    if (!phone) continue

    const name: string = (typeof e?.pushName === 'string' ? e.pushName : '').trim()
    if (name) {
      await pool.query(
        `INSERT INTO mensageria.contact_profiles (tenant_id, phone, name, updated_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (tenant_id, phone) DO UPDATE SET name = EXCLUDED.name, updated_at = now()`,
        [tenantId, phone, name],
      )
      await pool.query(
        `UPDATE mensageria.contacts SET name = $1, updated_at = now() WHERE tenant_id = $2 AND phone = $3`,
        [name, tenantId, phone],
      )
      // CRM: o lead do mesmo número acompanha o nome do WhatsApp (comparação pelos últimos 10 dígitos).
      await pool.query(
        `UPDATE public.leads_staging SET nome = $1
          WHERE tenant_id = $2 AND telefone IS NOT NULL
            AND RIGHT(regexp_replace(telefone, '\D', '', 'g'), 10) = RIGHT($3, 10)`,
        [name, tenantId, phone],
      )
    }

    const picUrl: string = typeof e?.profilePicUrl === 'string' ? e.profilePicUrl : ''
    if (picUrl) {
      const stored = await storeAvatar(tenantId, phone, picUrl)
      if (stored) {
        await pool.query(
          `INSERT INTO mensageria.contact_profiles (tenant_id, phone, name, avatar_url, updated_at)
           VALUES ($1, $2, NULL, $3, now())
           ON CONFLICT (tenant_id, phone) DO UPDATE SET avatar_url = EXCLUDED.avatar_url, updated_at = now()`,
          [tenantId, phone, stored],
        )
        await pool.query(
          `UPDATE mensageria.contacts SET avatar_url = $1, updated_at = now() WHERE tenant_id = $2 AND phone = $3`,
          [stored, tenantId, phone],
        )
      }
    }
  }
}

function resolveRealPhone(key: any): string {
  const digits = (s: string) => normalizeBrMobile(s.replace(/@(s\.whatsapp\.net|c\.us|lid)$/, '').replace(/\D/g, ''))
  const jid: string = key?.remoteJid || ''
  if (!jid.endsWith('@lid')) return digits(jid)
  const alt: string = key?.remoteJidAlt || key?.senderPn || ''
  if (alt.endsWith('@s.whatsapp.net') || alt.endsWith('@c.us')) return digits(alt)
  // Sem número real: NÃO devolve o identificador @lid como telefone (geraria lead sem contato).
  return ''
}

export async function POST(request: NextRequest) {
  const token = new URL(request.url).searchParams.get('token')
  if (!token) return NextResponse.json({ ok: false, error: 'token ausente' }, { status: 401 })

  let body: any
  try { body = await request.json() } catch { return NextResponse.json({ ok: false }, { status: 400 }) }

  // 1. Verificar se é um evento de mensagem chegando
  const event: string = body?.event || ''
  const isContactsEvent = event.toLowerCase().includes('contacts')
  if (!event.includes('messages') && event !== 'MESSAGES_UPSERT' && !isContactsEvent) {
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

  // Eventos de agenda (contacts.upsert/update): atualizam o nome de contatos já existentes.
  if (String(body?.event || '').toLowerCase().includes('contacts')) {
    await applyContactEvent(tenant.id, entries)
    return NextResponse.json({ ok: true, agenda: true })
  }

  for (const entry of entries) {
    const remoteJid: string = entry?.key?.remoteJid || ''
    if (!remoteJid || remoteJid.includes('@g.us')) continue // ignorar grupos

    // Mensagem enviada pelo próprio tenant (celular conectado): registra só como outbound na
    // conversa do destinatário. NÃO cria lead nem atribuição — lead nasce só de contato externo.
    if (entry?.key?.fromMe === true) {
      const outPhone = resolveRealPhone(entry?.key)
      const outText: string =
        entry?.message?.conversation ||
        entry?.message?.extendedTextMessage?.text ||
        ''
      // Mídia enviada por você (áudio, imagem, documento...): baixa e guarda igual às recebidas.
      const outMedia = await buildInboundMedia(tenant.id, entry?.key, entry?.message)
      if (outPhone && (outText || outMedia)) {
        const outProfile = await getContactProfile(tenant.id, outPhone)
        await recordOutboundFromTenant({
          tenantId: tenant.id,
          phone: outPhone,
          name: outProfile.name,
          avatarUrl: outProfile.avatarUrl,
          text: outText,
          media: outMedia,
          externalMessageId: entry?.key?.id ?? null,
        })
      }
      continue
    }

    // Extrair número limpo: "5511999998888@s.whatsapp.net" → "5511999998888"
    const phone = resolveRealPhone(entry?.key)
    // Política: nunca criar lead/contato sem número real identificado.
    if (!phone) {
      console.warn('[evolution-webhook] mensagem sem número real identificado — ignorada', remoteJid)
      continue
    }
    // Nome da agenda prevalece sobre o nome de perfil, quando a agenda já foi sincronizada.
    const profile = await getContactProfile(tenant.id, phone)
    const pushName: string | null = profile.name || entry?.pushName || null

    // Extrair texto da mensagem (suporta conversation, extendedText, imageCaption)
    const msgText: string =
      entry?.message?.conversation ||
      entry?.message?.extendedTextMessage?.text ||
      entry?.message?.imageMessage?.caption ||
      entry?.message?.videoMessage?.caption ||
      entry?.message?.documentMessage?.caption ||
      ''

    if (!msgText && !phone) continue

    // Reação de número desconhecido: ignorada (não cria contato nem lead). Só registra quando o
    // contato já existe na Mensageria, ou seja, já conversou com a empresa antes.
    const isReaction = !!entry?.message?.reactionMessage
    if (isReaction) {
      const { rows: known } = await pool.query(
        `SELECT 1 FROM mensageria.contacts WHERE tenant_id = $1 AND phone = $2 LIMIT 1`,
        [tenant.id, phone],
      )
      if (!known[0]) continue
    }

    // Mídia (imagem/áudio/vídeo/documento) ou reação: baixa e armazena antes de registrar.
    const media = await buildInboundMedia(tenant.id, entry?.key, entry?.message)

    // 4. Normaliza e delega toda a lógica de negócio (atribuição + lead + Mensageria) pro
    // processador agnóstico de provider.
    await processInboundWhatsAppMessage({
      tenantId: tenant.id,
      ownerClientId,
      phone,
      pushName,
      avatarUrl: profile.avatarUrl,
      text: msgText || null,
      media,
      skipCrm: isReaction,
      externalMessageId: entry?.key?.id ?? null,
    }).catch((err) => {
      console.error('[evolution-webhook] processInboundWhatsAppMessage falhou:', err)
    })
  }

  // Evolution espera resposta rápida (< 5s)
  return NextResponse.json({ ok: true })
}

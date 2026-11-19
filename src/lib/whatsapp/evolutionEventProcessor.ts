import pool from '@/lib/database/connection'
import { processInboundWhatsAppMessage } from '@/lib/whatsapp/inboundProcessor'
import { ingestMessage } from '@/lib/mensageria/ingest'
import { resolveWhatsAppInbox } from '@/lib/mensageria/inboxes'
import { buildInboundMedia, type InboundMedia } from '@/lib/mensageria/inboundMedia'
import { getWhatsappPolicy } from '@/lib/crm/whatsappPolicy'
import { storeAvatar, ensureContactAvatar } from '@/lib/mensageria/avatarService'
import { notifyWhatsApp } from '@/lib/marketing/services/agentNotificador'
import { webhookBaseUrl } from '@/lib/mensageria/evolutionWebhook'

/**
 * Processamento de UM evento bruto da Evolution API já recebido e persistido em
 * mensageria.webhook_inbox. Não conhece HTTP: o webhook só autentica e enfileira; o
 * drenador (src/lib/mensageria/webhookInbox.ts) chama processEvolutionBody com retry.
 *
 * Idempotente por construção: mensagens têm dedupe por externalId (ingest.ts), o lead tem
 * match engine (telefone/email) e o contato é upsert. Reprocessar um evento não duplica.
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
  occurredAt?: Date | null
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
      occurredAt: input.occurredAt ?? null,
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
    console.error('[evolution-processor] falha ao registrar outbound do tenant (não bloqueante):', err)
  }
}

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
            AND RIGHT(regexp_replace(telefone, '\\D', '', 'g'), 10) = RIGHT($3, 10)`,
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

/**
 * Horário real da mensagem, vindo do provider (messageTimestamp, em segundos desde a época).
 * Sem ele, devolve null e o registro usa o horário do processamento.
 */
function messageTimeOf(entry: any): Date | null {
  const raw = entry?.messageTimestamp
  const seconds = typeof raw === 'string' ? Number(raw) : raw
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) return null
  return new Date(seconds * 1000)
}

/**
 * Número real do remetente. Para @lid, usa o número informado no evento (e grava o par no mapa)
 * ou, se o evento não trouxe o número, o número já conhecido para aquele @lid.
 * Sem nenhum dos dois devolve vazio. NUNCA devolve o @lid como telefone.
 */
async function resolveRealPhone(tenantId: string, key: any): Promise<string> {
  const digits = (s: string) => normalizeBrMobile(s.replace(/@(s\.whatsapp\.net|c\.us|lid)$/, '').replace(/\D/g, ''))
  const jid: string = key?.remoteJid || ''
  if (!jid.endsWith('@lid')) return digits(jid)
  const alt: string = key?.remoteJidAlt || key?.senderPn || ''
  if (alt.endsWith('@s.whatsapp.net') || alt.endsWith('@c.us')) {
    const phone = digits(alt)
    await rememberLidPhone(tenantId, jid, phone)
    return phone
  }
  // Evento sem número: usa o que já foi visto para este @lid (a Evolution omite o número às vezes).
  const { rows } = await pool.query(
    `SELECT phone FROM mensageria.lid_phone_map WHERE tenant_id = $1 AND lid = $2 LIMIT 1`,
    [tenantId, jid],
  )
  return rows[0]?.phone ?? ''
}

/**
 * Registra uma mensagem de @lid sem número. Cada identificador vira uma linha (com contador).
 * Avisa o administrador (WhatsApp de alerta do tenant) só na PRIMEIRA vez que o identificador
 * aparece, para não gerar um aviso por mensagem. Falha aqui nunca derruba o processamento.
 */
function textOfEntry(entry: any): string {
  const m = entry?.message || {}
  return m.conversation || m.extendedTextMessage?.text || m.imageMessage?.caption || m.videoMessage?.caption ||
    `[${Object.keys(m)[0] || 'mensagem'}]`
}

/**
 * Grava a mensagem de um @lid sem número numa conversa identificada pelo @lid (contato sem
 * telefone). Devolve o id da conversa, para o aviso poder apontar para ela. Idempotente por
 * externalId (ingestMessage). Mídia ainda não é baixada nesse caminho: entra como texto de marcação.
 */
/** Padrão quando o tenant não tem valor (a coluna tem default 15000; isto é só a segurança). */
const LID_MEDIA_TIMEOUT_DEFAULT_MS = 15000

/**
 * Tempo máximo para baixar a mídia de uma mensagem @lid, definido por tenant
 * (public.tenants.lid_media_timeout_ms, editável na tela de dados da empresa).
 * Passou disso, a mensagem é gravada sem o arquivo e o atraso é registrado no log.
 */
async function lidMediaTimeoutFor(tenantId: string): Promise<number> {
  const { rows } = await pool.query(
    `SELECT lid_media_timeout_ms FROM public.tenants WHERE id = $1::uuid LIMIT 1`,
    [tenantId],
  )
  const v = Number(rows[0]?.lid_media_timeout_ms)
  return Number.isFinite(v) && v > 0 ? v : LID_MEDIA_TIMEOUT_DEFAULT_MS
}

async function fetchLidMediaWithBudget(tenantId: string, entry: any, timeoutMs: number): Promise<InboundMedia | null> {
  const started = Date.now()
  let timer: NodeJS.Timeout | undefined
  const timeout = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), timeoutMs)
  })
  try {
    const result = await Promise.race([buildInboundMedia(tenantId, entry?.key, entry?.message), timeout])
    if (result === 'timeout') {
      console.warn(
        `[evolution-processor] mídia @lid demorou mais de ${timeoutMs} ms (${entry?.key?.id}); ` +
        'mensagem gravada sem o arquivo. O download pode terminar em segundo plano.',
      )
      return { contentType: 'text', content: '[mídia não recebida: tempo esgotado]', attachments: [] }
    }
    const elapsed = Date.now() - started
    if (elapsed > timeoutMs / 2) {
      console.warn(`[evolution-processor] mídia @lid lenta: ${elapsed} ms (${entry?.key?.id})`)
    }
    return result
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function ingestLidMessage(tenantId: string, ownerClientId: string | null, entry: any): Promise<string | null> {
  const lid: string = entry?.key?.remoteJid || ''
  if (!lid.endsWith('@lid')) return null
  try {
    const inboxId = await resolveWhatsAppInbox(tenantId, ownerClientId)
    const media = await fetchLidMediaWithBudget(tenantId, entry, await lidMediaTimeoutFor(tenantId))
    const result = await ingestMessage({
      tenantId,
      clientId: ownerClientId,
      inboxId,
      contact: { name: entry?.pushName || null, attributes: { lid } },
      direction: 'inbound',
      senderType: 'contact',
      content: media ? (media.content ?? null) : textOfEntry(entry).slice(0, 4000),
      contentType: media ? media.contentType : 'text',
      attachments: media?.attachments ?? [],
      externalId: entry?.key?.id ?? null,
      occurredAt: messageTimeOf(entry),
    })
    return result.conversationId
  } catch (err) {
    console.error('[evolution-processor] falha ao gravar mensagem @lid sem número:', err)
    return null
  }
}

async function recordUnresolvedLid(tenantId: string, entry: any, conversationId: string | null): Promise<void> {
  const lid: string = entry?.key?.remoteJid || ''
  if (!lid.endsWith('@lid')) return
  try {
    const text = textOfEntry(entry)
    const pushName: string | null = entry?.pushName || null
    const { rows } = await pool.query(
      `INSERT INTO mensageria.lid_unresolved (tenant_id, lid, push_name, last_text)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tenant_id, lid) DO UPDATE
         SET hits = mensageria.lid_unresolved.hits + 1,
             last_seen_at = now(),
             last_text = EXCLUDED.last_text,
             push_name = COALESCE(EXCLUDED.push_name, mensageria.lid_unresolved.push_name)
       RETURNING (xmax = 0) AS is_new`,
      [tenantId, lid, pushName, text.slice(0, 1000)],
    )
    if (!rows[0]?.is_new) return
    const aviso =
      `⚠️ Mensagem de um contato sem número identificado pelo WhatsApp.\n` +
      `Identificador: ${lid}\n` +
      `Nome: ${pushName || 'não informado'}\n` +
      `Trecho: "${text.slice(0, 200)}"\n` +
      (conversationId
        ? `Responda pela plataforma: ${webhookBaseUrl()}/mensageria?conversation=${conversationId}\n`
        : '') +
      `Peça também o número ao contato para unificar a conversa.`
    // Aviso tentado uma vez, na primeira aparição do identificador (is_new). Se o tenant não
    // tiver número de alerta, notifyWhatsApp não envia nada e a pendência continua registrada.
    await notifyWhatsApp(aviso, tenantId)
  } catch (err) {
    console.error('[evolution-processor] falha ao registrar @lid sem número:', err)
  }
}

/** Grava o par @lid → número. Falha aqui nunca derruba o processamento da mensagem. */
async function rememberLidPhone(tenantId: string, lid: string, phone: string): Promise<void> {
  if (!phone) return
  try {
    await pool.query(
      `INSERT INTO mensageria.lid_phone_map (tenant_id, lid, phone, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (tenant_id, lid) DO UPDATE SET phone = EXCLUDED.phone, updated_at = now()`,
      [tenantId, lid, phone],
    )
    // Contato que já existia só pelo @lid (sem número) passa a ter o número: unifica as conversas.
    // Se outro contato já tiver esse número, a unificação é pulada (índice único) e segue registrada.
    await pool.query(
      `UPDATE mensageria.contacts
          SET phone = $3, attributes = attributes || jsonb_build_object('lid', $2::text), updated_at = now()
        WHERE tenant_id = $1 AND phone IS NULL AND attributes->>'lid' = $2`,
      [tenantId, lid, phone],
    )
  } catch (err) {
    console.error('[evolution-processor] falha ao gravar mapa @lid / unificar contato:', err)
  }
}

/** Processa uma entrada (mensagem) do evento. Lança erro se o processamento falhar. */
async function processEntry(tenantId: string, ownerClientId: string | null, entry: any): Promise<void> {
  const remoteJid: string = entry?.key?.remoteJid || ''
  if (!remoteJid || remoteJid.includes('@g.us')) return // ignorar grupos

  // Mensagem enviada pelo próprio tenant (celular conectado): registra só como outbound na
  // conversa do destinatário. NÃO cria lead nem atribuição — lead nasce só de contato externo.
  if (entry?.key?.fromMe === true) {
    // Respeita a política do tenant (GERA_MENSAGENS_WHATSAPP + módulos): sem ela, não grava nada.
    if (!(await getWhatsappPolicy(tenantId)).gerarMensagens) return
    const outPhone = await resolveRealPhone(tenantId, entry?.key)
    const outText: string =
      entry?.message?.conversation ||
      entry?.message?.extendedTextMessage?.text ||
      ''
    // Mídia enviada por você (áudio, imagem, documento...): baixa e guarda igual às recebidas.
    const outMedia = await buildInboundMedia(tenantId, entry?.key, entry?.message)
    if (outPhone && (outText || outMedia)) {
      const outProfile = await getContactProfile(tenantId, outPhone)
      await recordOutboundFromTenant({
        tenantId,
        phone: outPhone,
        name: outProfile.name,
        avatarUrl: outProfile.avatarUrl,
        text: outText,
        media: outMedia,
        externalMessageId: entry?.key?.id ?? null,
        occurredAt: messageTimeOf(entry),
      })
    }
    return
  }

  // Extrair número limpo: "5511999998888@s.whatsapp.net" → "5511999998888"
  const phone = await resolveRealPhone(tenantId, entry?.key)
  // Política: nunca criar lead/contato sem número real identificado.
  if (!phone) {
    console.warn('[evolution-processor] mensagem sem número real identificado — registrada para o administrador', remoteJid)
    const conversationId = await ingestLidMessage(tenantId, ownerClientId, entry)
    await recordUnresolvedLid(tenantId, entry, conversationId)
    return
  }
  // Nome da agenda prevalece sobre o nome de perfil, quando a agenda já foi sincronizada.
  const profile = await getContactProfile(tenantId, phone)
  const pushName: string | null = profile.name || entry?.pushName || null

  // Extrair texto da mensagem (suporta conversation, extendedText, imageCaption)
  const msgText: string =
    entry?.message?.conversation ||
    entry?.message?.extendedTextMessage?.text ||
    entry?.message?.imageMessage?.caption ||
    entry?.message?.videoMessage?.caption ||
    entry?.message?.documentMessage?.caption ||
    ''

  if (!msgText && !phone) return

  // Reação de número desconhecido: ignorada (não cria contato nem lead). Só registra quando o
  // contato já existe na Mensageria, ou seja, já conversou com a empresa antes.
  const isReaction = !!entry?.message?.reactionMessage
  if (isReaction) {
    const { rows: known } = await pool.query(
      `SELECT 1 FROM mensageria.contacts WHERE tenant_id = $1 AND phone = $2 LIMIT 1`,
      [tenantId, phone],
    )
    if (!known[0]) return
  }

  // Mídia (imagem/áudio/vídeo/documento) ou reação: baixa e armazena antes de registrar.
  const media = await buildInboundMedia(tenantId, entry?.key, entry?.message)

  // Normaliza e delega toda a lógica de negócio (atribuição + lead + Mensageria) pro
  // processador agnóstico de provider.
  await processInboundWhatsAppMessage({
    tenantId,
    ownerClientId,
    phone,
    pushName,
    avatarUrl: profile.avatarUrl,
    text: msgText || null,
    media,
    skipCrm: isReaction,
    externalMessageId: entry?.key?.id ?? null,
    occurredAt: messageTimeOf(entry),
  })
  // Foto de perfil sob demanda: em segundo plano, só se o TTL estiver vencido. Não bloqueia.
  ensureContactAvatar(tenantId, phone)
}

/**
 * Processa um evento bruto completo. Cada entrada é tentada isoladamente; se alguma falhar,
 * o erro agregado é lançado para o drenador agendar nova tentativa do evento inteiro.
 */
export async function processEvolutionBody(tenantId: string, ownerClientId: string | null, body: any): Promise<void> {
  const entries: any[] = Array.isArray(body?.data) ? body.data : body?.data ? [body.data] : []
  if (entries.length === 0) return

  // Eventos de agenda (contacts.upsert/update): atualizam o nome de contatos já existentes.
  if (String(body?.event || '').toLowerCase().includes('contacts')) {
    await applyContactEvent(tenantId, entries)
    return
  }

  const failures: string[] = []
  for (const entry of entries) {
    try {
      await processEntry(tenantId, ownerClientId, entry)
    } catch (err: any) {
      console.error('[evolution-processor] entrada falhou:', err)
      failures.push(String(err?.message || err).slice(0, 300))
    }
  }
  if (failures.length > 0) {
    throw new Error(`${failures.length} entrada(s) falharam: ${failures.join(' | ')}`)
  }
}

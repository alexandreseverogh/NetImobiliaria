import axios from 'axios'
import pool from '@/lib/database/connection'
import { uploadToS3 } from '@/lib/storage/s3-client'
import { resolveSegment } from '@/lib/intelligence/segmentResolver'

/**
 * Foto de perfil do contato, SOB DEMANDA, com TTL em cascata: cliente > tenant > segmento.
 *
 * Regras (ver conversa de definição, 2026-11-18):
 * - Nunca baixa a agenda inteira. A foto é buscada só quando o contato é usado (mensagem
 *   recebida ou conversa aberta) e só se a última busca estiver vencida pelo TTL.
 * - Nunca bloqueia a troca de mensagens: tudo aqui é best-effort e nunca lança exceção.
 * - O valor padrão do TTL vive no banco (system_segments.avatar_ttl_days_default), nunca no código.
 */

const inFlight = new Set<string>()
const DAY_MS = 24 * 60 * 60 * 1000

/**
 * O TTL de foto só existe para tenant com o módulo Mensageria contratado E com
 * "Gerar mensagens no WhatsApp" marcado. Fora disso não há configuração nem busca de foto.
 */
export async function isAvatarTtlEnabled(tenantId: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT t.gera_mensagens_whatsapp AS gera,
            EXISTS (
              SELECT 1 FROM public.tenant_modules tm
              JOIN public.system_modules sm ON sm.id = tm.module_id
              WHERE tm.tenant_id = t.id AND sm.slug = 'mensageria' AND tm.is_enabled = true
            ) AS has_mensageria
       FROM public.tenants t WHERE t.id = $1::uuid LIMIT 1`,
    [tenantId],
  )
  return !!(rows[0]?.gera && rows[0]?.has_mensageria)
}

/** Resolve o TTL (em dias) em cascata. Null quando não há nenhum nível configurado. */
export async function resolveAvatarTtlDays(tenantId: string, clientId: string | null): Promise<number | null> {
  if (clientId) {
    const { rows } = await pool.query(
      `SELECT avatar_ttl_days FROM public.clientes WHERE uuid = $1::uuid LIMIT 1`,
      [clientId],
    )
    if (rows[0]?.avatar_ttl_days != null) return Number(rows[0].avatar_ttl_days)
  }

  const { rows: tenantRows } = await pool.query(
    `SELECT avatar_ttl_days FROM public.tenants WHERE id = $1::uuid LIMIT 1`,
    [tenantId],
  )
  if (tenantRows[0]?.avatar_ttl_days != null) return Number(tenantRows[0].avatar_ttl_days)

  const segment = await resolveSegment(tenantId, clientId)
  if (!segment) return null
  const { rows: segRows } = await pool.query(
    `SELECT avatar_ttl_days_default FROM public.system_segments WHERE id = $1::uuid LIMIT 1`,
    [segment.id],
  )
  return segRows[0]?.avatar_ttl_days_default != null ? Number(segRows[0].avatar_ttl_days_default) : null
}

/**
 * Baixa a foto (a URL original do WhatsApp expira) e guarda no nosso storage.
 * Falha não bloqueia nada: retorna null e o avatar segue com as iniciais.
 */
export async function storeAvatar(tenantId: string, phone: string, sourceUrl: string): Promise<string | null> {
  try {
    const res = await axios.get(sourceUrl, { responseType: 'arraybuffer', timeout: 15000 })
    const buffer = Buffer.from(res.data)
    const mime: string = String(res.headers?.['content-type'] || 'image/jpeg')
    const uploaded = await uploadToS3(`mensageria/avatars/${tenantId}/${phone}.jpg`, buffer, mime)
    return uploaded?.url ?? null
  } catch (err) {
    console.error('[avatar] falha ao guardar foto de perfil:', err)
    return null
  }
}

/**
 * Garante uma foto atual para o contato. Chamada em segundo plano (fire-and-forget) pelo
 * fluxo de mensagens e pela abertura da conversa. Retorna sem erro em qualquer caso.
 */
export function ensureContactAvatar(tenantId: string, phone: string): void {
  const key = `${tenantId}:${phone}`
  if (inFlight.has(key)) return
  inFlight.add(key)
  refreshContactAvatar(tenantId, phone)
    .catch((err) => console.error('[avatar] falha na atualização de foto (não bloqueante):', err))
    .finally(() => inFlight.delete(key))
}

async function refreshContactAvatar(tenantId: string, phone: string): Promise<void> {
  const { rows: contactRows } = await pool.query(
    `SELECT client_id FROM mensageria.contacts WHERE tenant_id = $1 AND phone = $2 LIMIT 1`,
    [tenantId, phone],
  )
  if (!contactRows[0]) return
  if (!(await isAvatarTtlEnabled(tenantId))) return
  const clientId: string | null = contactRows[0].client_id ?? null

  const ttlDays = await resolveAvatarTtlDays(tenantId, clientId)
  if (ttlDays == null) return

  const { rows: profileRows } = await pool.query(
    `SELECT avatar_url, avatar_fetched_at FROM mensageria.contact_profiles WHERE tenant_id = $1 AND phone = $2 LIMIT 1`,
    [tenantId, phone],
  )
  const current = profileRows[0]
  const fresh =
    current?.avatar_url &&
    current?.avatar_fetched_at &&
    Date.now() - new Date(current.avatar_fetched_at).getTime() < ttlDays * DAY_MS
  if (fresh) return

  const { rows: tenantRows } = await pool.query(
    `SELECT evolution_api_url, evolution_api_key, evolution_instance FROM public.tenants WHERE id = $1::uuid LIMIT 1`,
    [tenantId],
  )
  const cfg = tenantRows[0]
  if (!cfg?.evolution_api_url || !cfg?.evolution_api_key || !cfg?.evolution_instance) return

  let pictureUrl: string | null = null
  try {
    const res = await axios.post(
      `${cfg.evolution_api_url}/chat/fetchProfilePictureUrl/${cfg.evolution_instance}`,
      { number: phone },
      { headers: { apikey: cfg.evolution_api_key }, timeout: 10000 },
    )
    pictureUrl = typeof res.data?.profilePictureUrl === 'string' ? res.data.profilePictureUrl : null
  } catch (err) {
    console.error('[avatar] Evolution não devolveu a foto (não bloqueante):', (err as Error).message)
    return
  }

  // Sem foto no WhatsApp: marca a data da busca para não repetir até o TTL vencer.
  if (!pictureUrl) {
    await pool.query(
      `INSERT INTO mensageria.contact_profiles (tenant_id, phone, avatar_fetched_at, updated_at)
       VALUES ($1, $2, now(), now())
       ON CONFLICT (tenant_id, phone) DO UPDATE SET avatar_fetched_at = now(), updated_at = now()`,
      [tenantId, phone],
    )
    return
  }

  const stored = await storeAvatar(tenantId, phone, pictureUrl)
  if (!stored) return

  await pool.query(
    `INSERT INTO mensageria.contact_profiles (tenant_id, phone, avatar_url, avatar_fetched_at, updated_at)
     VALUES ($1, $2, $3, now(), now())
     ON CONFLICT (tenant_id, phone) DO UPDATE
       SET avatar_url = EXCLUDED.avatar_url, avatar_fetched_at = now(), updated_at = now()`,
    [tenantId, phone, stored],
  )
  await pool.query(
    `UPDATE mensageria.contacts SET avatar_url = $1, updated_at = now() WHERE tenant_id = $2 AND phone = $3`,
    [stored, tenantId, phone],
  )
}

import crypto from 'crypto'
import pool from '@/lib/database/connection'
import { processEvolutionBody } from '@/lib/whatsapp/evolutionEventProcessor'

/**
 * Fila durável de eventos da Evolution (mensageria.webhook_inbox).
 *
 * Fluxo: o webhook chama enqueueEvolutionEvent (grava o bruto e responde 200 rápido) e dispara
 * drainWebhookInbox em segundo plano. O cron /api/cron/mensageria/webhook-drain drena o que sobrou
 * (processo caiu, falha, lentidão). Nada é descartado: evento que falha é reagendado com backoff
 * até MAX_ATTEMPTS; depois fica como 'failed', visível para reprocessamento manual.
 */

const MAX_ATTEMPTS = 8
const LOCK_TIMEOUT_MIN = 5 // linha presa em 'processing' por mais que isso é recuperada

/** Grava o evento bruto. Reenvio idêntico (mesmo payload) não cria segunda linha. */
export async function enqueueEvolutionEvent(input: {
  tenantId: string
  ownerClientId: string | null
  body: unknown
}): Promise<{ id: number | null; duplicate: boolean }> {
  const json = JSON.stringify(input.body)
  const dedupeKey = crypto.createHash('sha256').update(json).digest('hex')
  const { rows } = await pool.query(
    `INSERT INTO mensageria.webhook_inbox (tenant_id, owner_client_id, dedupe_key, payload)
     VALUES ($1, $2, $3, $4::jsonb)
     ON CONFLICT (tenant_id, dedupe_key) DO NOTHING
     RETURNING id`,
    [input.tenantId, input.ownerClientId, dedupeKey, json],
  )
  return { id: rows[0]?.id ?? null, duplicate: !rows[0] }
}

export interface DrainResult {
  claimed: number
  done: number
  retry: number
  failed: number
}

/**
 * Reivindica um lote de eventos pendentes (SKIP LOCKED: duas execuções concorrentes nunca pegam
 * a mesma linha) e os processa. Seguro para rodar em paralelo com o cron.
 */
export async function drainWebhookInbox({ batch = 20 }: { batch?: number } = {}): Promise<DrainResult> {
  const { rows: claimed } = await pool.query(
    `UPDATE mensageria.webhook_inbox w
        SET status = 'processing', locked_at = now(), attempts = w.attempts + 1
      WHERE w.id IN (
        SELECT id FROM mensageria.webhook_inbox
         WHERE (status = 'pending' AND next_attempt_at <= now())
            OR (status = 'processing' AND locked_at < now() - make_interval(mins => $2::int))
         ORDER BY received_at
         LIMIT $1
         FOR UPDATE SKIP LOCKED
      )
      RETURNING w.id, w.tenant_id, w.owner_client_id, w.payload, w.attempts`,
    [batch, LOCK_TIMEOUT_MIN],
  )

  const result: DrainResult = { claimed: claimed.length, done: 0, retry: 0, failed: 0 }

  for (const row of claimed) {
    try {
      await processEvolutionBody(row.tenant_id, row.owner_client_id, row.payload)
      await pool.query(
        `UPDATE mensageria.webhook_inbox
            SET status = 'done', processed_at = now(), locked_at = NULL, last_error = NULL
          WHERE id = $1`,
        [row.id],
      )
      result.done++
    } catch (err: any) {
      const message = String(err?.message || err).slice(0, 2000)
      if (row.attempts >= MAX_ATTEMPTS) {
        await pool.query(
          `UPDATE mensageria.webhook_inbox
              SET status = 'failed', locked_at = NULL, last_error = $2
            WHERE id = $1`,
          [row.id, message],
        )
        result.failed++
      } else {
        // Backoff exponencial: 30s, 60s, 120s... limitado a 1h.
        const delaySec = Math.min(30 * 2 ** (row.attempts - 1), 3600)
        await pool.query(
          `UPDATE mensageria.webhook_inbox
              SET status = 'pending', locked_at = NULL, last_error = $2,
                  next_attempt_at = now() + make_interval(secs => $3::int)
            WHERE id = $1`,
          [row.id, message, delaySec],
        )
        result.retry++
      }
      console.error(`[webhook-inbox] evento ${row.id} falhou (tentativa ${row.attempts}):`, message)
    }
  }

  return result
}

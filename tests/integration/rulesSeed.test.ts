import { describe, it, expect, beforeAll } from 'vitest'
import { RUN_DB, loadEnvLocal } from './helpers'
import { RULE_REGISTRY } from '@/lib/rules/ruleRegistry'

// Integridade do seed da Fase 2 contra o Postgres de desenvolvimento (RUN_DB_INTEGRATION=1).
// Toda chave do ruleRegistry precisa ter valor em TODOS os segmentos ativos, senão o resolver
// lançaria RuleMissingError em produção.

describe.runIf(RUN_DB)('seed da Fase 2 — chaves do ruleRegistry presentes em todos os segmentos', () => {
  let pool: any

  beforeAll(async () => {
    loadEnvLocal()
    const conn = await import('@/lib/database/connection')
    pool = conn.default ?? conn.pool
  })

  it('cada chave do registry tem uma linha por segmento ativo (sem rede)', async () => {
    const segs = await pool.query(`SELECT id FROM public.system_segments WHERE is_active = true`)
    const keys = Object.keys(RULE_REGISTRY)
    const res = await pool.query(
      `SELECT segment_id, metric_key, value FROM public.system_benchmarks
        WHERE metric_key = ANY($1::text[]) AND network_id IS NULL`,
      [keys],
    )
    for (const seg of segs.rows) {
      for (const key of keys) {
        const hit = res.rows.find((r: any) => r.segment_id === seg.id && r.metric_key === key)
        expect(hit, `segmento ${seg.id} sem valor para ${key}`).toBeDefined()
      }
    }
  })

  it('valores seedados estão dentro da faixa declarada no registry', async () => {
    const res = await pool.query(
      `SELECT metric_key, value FROM public.system_benchmarks WHERE metric_key = ANY($1::text[]) AND network_id IS NULL`,
      [Object.keys(RULE_REGISTRY)],
    )
    for (const row of res.rows) {
      const def = RULE_REGISTRY[row.metric_key]
      const v = Number(row.value)
      expect(v, `${row.metric_key}=${v}`).toBeGreaterThanOrEqual(def.min)
      expect(v, `${row.metric_key}=${v}`).toBeLessThanOrEqual(def.max)
    }
  })
})

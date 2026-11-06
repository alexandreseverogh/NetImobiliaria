import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest'
import type { PoolClient } from 'pg'
import {
  RUN_DB, loadEnvLocal, insertTenant, insertParams, insertCorretor, insertArea, setStrategies,
} from './helpers'

// Estratégias owner_of_asset (nível 1) e plantonista_fallback (nível 4) contra o Postgres de
// desenvolvimento (RUN_DB_INTEGRATION=1). Cada teste roda numa transação com ROLLBACK.

async function setPlantonista(c: PoolClient, userId: string, tenantId: string) {
  await c.query(
    `UPDATE public.user_tenant_membership SET is_plantonista = true WHERE user_id = $1 AND tenant_id = $2`,
    [userId, tenantId],
  )
}

async function setIndisponivel(c: PoolClient, userId: string) {
  await c.query(`UPDATE public.users SET indisponivel_ate = now() + interval '1 day' WHERE id = $1`, [userId])
}

describe.runIf(RUN_DB)('owner_of_asset — dono do ativo não é roteado entre tenants', () => {
  let pool: any
  let DistributionEngine: any
  let client: PoolClient
  let segmentId: string
  const suffix = Date.now().toString(36) + 'o'

  let tenantA: string
  let tenantB: string
  let ownerA: string
  let ownerB: string

  beforeAll(async () => {
    loadEnvLocal()
    const conn = await import('@/lib/database/connection')
    pool = conn.default ?? conn.pool
    DistributionEngine = (await import('@/lib/routing/distributionEngine')).DistributionEngine
    const seg = await pool.query(`SELECT id FROM public.system_segments WHERE slug = 'geral' AND is_active = true LIMIT 1`)
    segmentId = seg.rows[0].id
  })

  beforeEach(async () => {
    client = await pool.connect()
    await client.query('BEGIN')
    await setStrategies(client, segmentId, ['owner_of_asset'])
    tenantA = await insertTenant(client, segmentId, `TESTE-OWN-A-${suffix}`)
    tenantB = await insertTenant(client, segmentId, `TESTE-OWN-B-${suffix}`)
    await insertParams(client, tenantA, { interno: 15, externo: 5 })
    await insertParams(client, tenantB, { interno: 15, externo: 5 })
    ownerA = await insertCorretor(client, tenantA, `oa-${suffix}`)
    ownerB = await insertCorretor(client, tenantB, `ob-${suffix}`)
  })

  afterEach(async () => {
    try {
      await client.query('ROLLBACK')
    } finally {
      client.release()
    }
  })

  it('dono do ativo do próprio tenant é escolhido', async () => {
    const r = await DistributionEngine.findBestCandidate(
      { lead_id: `o1-${suffix}`, tenant_id: tenantA, source_owner_id: ownerA },
      [],
      client,
    )
    expect(r).not.toBeNull()
    expect(r.id).toBe(ownerA)
    expect(r.motivo_atribuicao).toBe('dono_ativo')
  })

  it('dono de outro tenant nunca é roteado para o lead do tenant A', async () => {
    const r = await DistributionEngine.findBestCandidate(
      { lead_id: `o2-${suffix}`, tenant_id: tenantA, source_owner_id: ownerB },
      [],
      client,
    )
    expect(r).toBeNull()
  })

  it('dono em ausência temporária sai da fila (lead segue para a próxima estratégia)', async () => {
    await setIndisponivel(client, ownerA)
    const r = await DistributionEngine.findBestCandidate(
      { lead_id: `o3-${suffix}`, tenant_id: tenantA, source_owner_id: ownerA },
      [],
      client,
    )
    expect(r).toBeNull()
  })
})

describe.runIf(RUN_DB)('plantonista_fallback — plantão respeita tenant, ausência e área', () => {
  let pool: any
  let DistributionEngine: any
  let client: PoolClient
  let segmentId: string
  const suffix = Date.now().toString(36) + 'p'
  const ESTADO = 'PE'
  const CIDADE = 'Olinda'

  let tenantA: string
  let tenantB: string
  let plantonistaA: string
  let plantonistaA2: string
  let plantonistaB: string

  beforeAll(async () => {
    loadEnvLocal()
    const conn = await import('@/lib/database/connection')
    pool = conn.default ?? conn.pool
    DistributionEngine = (await import('@/lib/routing/distributionEngine')).DistributionEngine
    const seg = await pool.query(`SELECT id FROM public.system_segments WHERE slug = 'geral' AND is_active = true LIMIT 1`)
    segmentId = seg.rows[0].id
  })

  beforeEach(async () => {
    client = await pool.connect()
    await client.query('BEGIN')
    await setStrategies(client, segmentId, ['plantonista_fallback'])
    tenantA = await insertTenant(client, segmentId, `TESTE-PLT-A-${suffix}`)
    tenantB = await insertTenant(client, segmentId, `TESTE-PLT-B-${suffix}`)
    await insertParams(client, tenantA, { interno: 15, externo: 5 })
    await insertParams(client, tenantB, { interno: 15, externo: 5 })
    plantonistaA = await insertCorretor(client, tenantA, `pa-${suffix}`)
    plantonistaA2 = await insertCorretor(client, tenantA, `pa2-${suffix}`)
    plantonistaB = await insertCorretor(client, tenantB, `pb-${suffix}`)
    await setPlantonista(client, plantonistaA, tenantA)
    await setPlantonista(client, plantonistaA2, tenantA)
    await setPlantonista(client, plantonistaB, tenantB)
  })

  afterEach(async () => {
    try {
      await client.query('ROLLBACK')
    } finally {
      client.release()
    }
  })

  it('plantonista do tenant A atende o lead do tenant A, nunca o de B', async () => {
    const r = await DistributionEngine.findBestCandidate(
      { lead_id: `p1-${suffix}`, tenant_id: tenantA, estado_fk: ESTADO, cidade_fk: CIDADE },
      [],
      client,
    )
    expect(r).not.toBeNull()
    expect(r.id).not.toBe(plantonistaB)
    expect([plantonistaA, plantonistaA2]).toContain(r.id)
    expect(r.motivo_atribuicao).toBe('fallback_plantonista')
  })

  it('plantonista da mesma área tem prioridade sobre o de menor carga', async () => {
    await insertArea(client, plantonistaA2, tenantA, ESTADO, CIDADE)
    const r = await DistributionEngine.findBestCandidate(
      { lead_id: `p2-${suffix}`, tenant_id: tenantA, estado_fk: ESTADO, cidade_fk: CIDADE },
      [],
      client,
    )
    expect(r.id).toBe(plantonistaA2)
  })

  it('plantonista de férias/atestado não recebe o plantão', async () => {
    await setIndisponivel(client, plantonistaA)
    await setIndisponivel(client, plantonistaA2)
    const r = await DistributionEngine.findBestCandidate(
      { lead_id: `p3-${suffix}`, tenant_id: tenantA, estado_fk: ESTADO, cidade_fk: CIDADE },
      [],
      client,
    )
    expect(r).toBeNull()
  })
})

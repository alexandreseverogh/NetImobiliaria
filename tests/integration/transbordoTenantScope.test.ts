import { describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest'
import type { PoolClient } from 'pg'
import {
  RUN_DB, loadEnvLocal, insertTenant, insertParams, insertCorretor, setStrategies,
} from './helpers'

// Teste de integração contra o Postgres de desenvolvimento (RUN_DB_INTEGRATION=1).
// Cada teste roda numa transação com ROLLBACK. Ver docs/PLANO_REGRAS_CONFIGURAVEIS.md §6.2.

describe.runIf(RUN_DB)('transbordo — isolamento por tenant e SLA por tenant (round-robin)', () => {
  let pool: any
  let DistributionEngine: any
  let client: PoolClient
  let segmentId: string
  const suffix = Date.now().toString(36)

  let tenantA: string
  let tenantB: string
  let tenantEmpty: string
  let userA: string
  let userB: string

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
    await setStrategies(client, segmentId, ['round_robin'])
    tenantA = await insertTenant(client, segmentId, `TESTE-TX-A-${suffix}`)
    tenantB = await insertTenant(client, segmentId, `TESTE-TX-B-${suffix}`)
    tenantEmpty = await insertTenant(client, segmentId, `TESTE-TX-VAZIO-${suffix}`)
    await insertParams(client, tenantA, { interno: 30, externo: 9 })
    await insertParams(client, tenantB, { interno: 7, externo: 2 })
    userA = await insertCorretor(client, tenantA, `a-${suffix}`)
    userB = await insertCorretor(client, tenantB, `b-${suffix}`)
  })

  afterEach(async () => {
    try {
      await client.query('ROLLBACK')
    } finally {
      client.release()
    }
  })

  it('lead do tenant A nunca recebe corretor do tenant B', async () => {
    const r = await DistributionEngine.findBestCandidate({ lead_id: `t-${suffix}`, tenant_id: tenantA }, [], client)
    expect(r).not.toBeNull()
    expect(r.id).toBe(userA)
    expect(r.id).not.toBe(userB)
  })

  it('tenant sem nenhum corretor não cai no corretor de outro tenant', async () => {
    const r = await DistributionEngine.findBestCandidate({ lead_id: `t-${suffix}`, tenant_id: tenantEmpty }, [], client)
    expect(r).toBeNull()
  })

  it('SLA aplicado vem dos parâmetros do próprio tenant (30 para A, 7 para B)', async () => {
    const rA = await DistributionEngine.findBestCandidate({ lead_id: 'x', tenant_id: tenantA }, [], client)
    const rB = await DistributionEngine.findBestCandidate({ lead_id: 'y', tenant_id: tenantB }, [], client)
    expect(rA.sla_minutos).toBe(30)
    expect(rB.sla_minutos).toBe(7)
  })

  it('zero configurado no tenant é preservado (não vira padrão)', async () => {
    await client.query(`UPDATE public.parametros_imoveis SET sla_minutos_aceite_lead_interno = 0 WHERE tenant_id = $1`, [tenantA])
    const r = await DistributionEngine.findBestCandidate({ lead_id: 'z', tenant_id: tenantA }, [], client)
    expect(r.sla_minutos).toBe(0)
  })

  it('exclusão de histórico é respeitada (corretor já tratado não volta)', async () => {
    const r = await DistributionEngine.findBestCandidate({ lead_id: 'e', tenant_id: tenantA }, [userA], client)
    expect(r).toBeNull()
  })

  it('sem tenant_id o engine recusa decidir (nunca usa tenant padrão)', async () => {
    await expect(
      DistributionEngine.findBestCandidate({ lead_id: 'n', tenant_id: undefined }, [], client),
    ).rejects.toThrow(/tenant_id obrigatório/)
  })
})

describe.runIf(RUN_DB)('geo_area — área de atuação não vaza entre tenants', () => {
  let pool: any
  let DistributionEngine: any
  let client: PoolClient
  let segmentId: string
  const suffix = Date.now().toString(36) + 'g'
  const ESTADO = 'PE'
  const CIDADE = 'Recife'

  let tenantA: string
  let tenantB: string
  let corretorA: string
  let corretorB: string

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
    await setStrategies(client, segmentId, ['geo_area'])
    tenantA = await insertTenant(client, segmentId, `TESTE-GEO-A-${suffix}`)
    tenantB = await insertTenant(client, segmentId, `TESTE-GEO-B-${suffix}`)
    await insertParams(client, tenantA, { interno: 15, externo: 5 })
    await insertParams(client, tenantB, { interno: 15, externo: 5 })
    corretorA = await insertCorretor(client, tenantA, `ga-${suffix}`)
    corretorB = await insertCorretor(client, tenantB, `gb-${suffix}`)
    // Os dois atendem exatamente a mesma cidade: só o tenant de origem do lead pode ser escolhido.
    await client.query(
      `INSERT INTO public.atendente_area_atuacao (corretor_fk, estado_fk, cidade_fk, tenant_id) VALUES
         ($1, $3, $4, $5), ($2, $3, $4, $6)`,
      [corretorA, corretorB, ESTADO, CIDADE, tenantA, tenantB],
    )
  })

  afterEach(async () => {
    try {
      await client.query('ROLLBACK')
    } finally {
      client.release()
    }
  })

  it('lead do tenant A na cidade atendida por A e B recebe só o corretor de A', async () => {
    const r = await DistributionEngine.findBestCandidate(
      { lead_id: `g-${suffix}`, tenant_id: tenantA, estado_fk: ESTADO, cidade_fk: CIDADE },
      [],
      client,
    )
    expect(r).not.toBeNull()
    expect(r.id).toBe(corretorA)
    expect(r.motivo_atribuicao).toMatch(/^area_match_/)
  })

  it('se o único atendente da área pertence a outro tenant, o lead não é roteado', async () => {
    // Remove o corretor de A da área: só B atende Recife.
    await client.query(`DELETE FROM public.atendente_area_atuacao WHERE corretor_fk = $1`, [corretorA])
    const r = await DistributionEngine.findBestCandidate(
      { lead_id: `g2-${suffix}`, tenant_id: tenantA, estado_fk: ESTADO, cidade_fk: CIDADE },
      [],
      client,
    )
    expect(r).toBeNull()
  })

  it('lead sem estado/cidade não aciona a estratégia geográfica', async () => {
    const r = await DistributionEngine.findBestCandidate(
      { lead_id: `g3-${suffix}`, tenant_id: tenantA },
      [],
      client,
    )
    expect(r).toBeNull()
  })
})

import fs from 'fs'
import path from 'path'
import type { PoolClient } from 'pg'

// Auxiliares dos testes de integração. Todas as funções de escrita devem ser chamadas
// dentro de uma transação que termina em ROLLBACK (nada é persistido).

export const RUN_DB = process.env.RUN_DB_INTEGRATION === '1'

// Carrega .env.local sem imprimir valores (o pool lê DB_* do ambiente).
export function loadEnvLocal() {
  const file = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(file)) return
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
    }
  }
}

export async function insertTenant(c: PoolClient, segmentId: string, name: string): Promise<string> {
  const r = await c.query(
    `INSERT INTO public.tenants (name, slug, segment_id) VALUES ($1, $2, $3) RETURNING id`,
    [name, name.toLowerCase(), segmentId],
  )
  return r.rows[0].id
}

export async function insertParams(
  c: PoolClient,
  tenantId: string,
  s: { interno: number; externo: number },
) {
  await c.query(
    `INSERT INTO public.parametros_imoveis
       (tenant_id, sla_minutos_aceite_lead_interno, sla_minutos_aceite_lead)
     VALUES ($1, $2, $3)`,
    [tenantId, s.interno, s.externo],
  )
}

/** Cria usuário corretor (role "Corretor", id 45) ligado ao tenant. */
export async function insertCorretor(
  c: PoolClient,
  tenantId: string,
  tag: string,
  tipo: 'Interno' | 'Externo' = 'Interno',
): Promise<string> {
  const u = await c.query(
    `INSERT INTO public.users (username, email, password, nome, ativo, tipo_corretor)
     VALUES ($1, $2, 'x', $3, true, $4) RETURNING id`,
    [`tx-${tag}`, `tx-${tag}@teste.invalid`, `Corretor ${tag}`, tipo],
  )
  const userId = u.rows[0].id
  await c.query(`INSERT INTO public.user_tenant_membership (user_id, tenant_id) VALUES ($1, $2)`, [userId, tenantId])
  await c.query(`INSERT INTO public.user_role_assignments (user_id, role_id) VALUES ($1, 45)`, [userId])
  return userId
}

/** Área de atuação do corretor (estado + cidade). */
export async function insertArea(c: PoolClient, corretorId: string, tenantId: string, estado: string, cidade: string) {
  await c.query(
    `INSERT INTO public.atendente_area_atuacao (corretor_fk, estado_fk, cidade_fk, tenant_id)
     VALUES ($1, $2, $3, $4)`,
    [corretorId, estado, cidade, tenantId],
  )
}

/** Substitui as estratégias do segmento por uma lista ordenada (dentro da transação). */
export async function setStrategies(c: PoolClient, segmentId: string, keys: string[]) {
  await c.query(`DELETE FROM public.segment_distribution_strategies WHERE segment_id = $1`, [segmentId])
  for (let i = 0; i < keys.length; i++) {
    await c.query(
      `INSERT INTO public.segment_distribution_strategies (segment_id, strategy_key, priority, is_active, config)
       VALUES ($1, $2, $3, true, '{}'::jsonb)`,
      [segmentId, keys[i], i + 1],
    )
  }
}

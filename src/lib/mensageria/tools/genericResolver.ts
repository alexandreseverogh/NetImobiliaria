/**
 * Camada semântica dirigida por metadados (docs/PLANO_MENSAGERIA.md seção 14.6-A).
 * Uma entidade nova em mensageria.segment_data_entities vira uma ferramenta nova do
 * bot sem deploy — este resolver genérico é o único código que monta a query.
 *
 * Fronteira de segurança: read-only, tenant_id sempre forçado no servidor, queries
 * parametrizadas para os filtros do LLM, e só colunas marcadas selectable/filterable
 * entram na query — o LLM nunca decide SQL, só escolhe entidade e preenche filtros
 * validados contra a whitelist de colunas. `default_filter` e `relations` vêm de
 * config curada (Master), não de input do LLM. Diferente do rascunho da seção 14.6-A
 * (que interpolava `r.join_table`/`r.on`/`r.select` como SQL cru), aqui o resolver
 * MONTA o SQL das relations a partir de campos "bare" — cada tabela/coluna passa por
 * IDENT_RE, então um erro/typo de config não vira injeção nem quebra o read-only.
 */
import pool from '@/lib/database/connection'
import type { LlmToolDef } from '@/lib/marketing/services/llmClient'

interface EntityColumn {
  name: string
  type: 'text' | 'number' | 'boolean'
  description?: string
  filterable?: boolean
  selectable?: boolean
}

/**
 * Relação (tabela correlacionada) trazida como subquery escalar correlacionada — sem
 * fan-out na query principal. Suporta agregação one-to-many e multi-hop (tabela-ponte
 * → tabela de lookup do nome). Ex.: imovel → imovel_amenidades → amenidades.nome.
 */
interface EntityRelation {
  name: string                 // chave no resultado (ex.: 'amenidades') — vira coluna do SELECT
  description?: string
  bridge_table: string         // tabela correlacionada / ponte (ex.: 'imovel_amenidades')
  bridge_fk: string            // coluna da ponte que referencia a PK da entidade base (ex.: 'imovel_id')
  base_pk?: string             // PK da entidade base (default 'id')
  lookup_table?: string        // multi-hop: tabela do nome legível (ex.: 'amenidades')
  lookup_fk?: string           // coluna da ponte que aponta pra PK do lookup (ex.: 'amenidade_id')
  lookup_pk?: string           // PK do lookup (default 'id')
  select_column: string        // coluna trazida (do lookup se houver, senão da ponte)
  agg?: 'array' | 'count' | 'first'
  max?: number                 // teto de itens no array (default 25)
}

export interface SegmentDataEntity {
  id: string
  entityName: string
  tableName: string
  description: string | null
  columns: EntityColumn[]
  relations: EntityRelation[]
  tenantColumn: string
  defaultFilter: string | null
  maxRows: number
}

// Identificador SQL seguro — nunca interpolar nome de tabela/coluna sem passar por aqui.
const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/
const ok = (s: unknown): s is string => typeof s === 'string' && IDENT_RE.test(s)

export async function loadEntitiesForSegment(segmentId: string | null, tenantId: string): Promise<SegmentDataEntity[]> {
  const { rows } = await pool.query(
    `SELECT id, entity_name, table_name, description, columns, relations, tenant_column, default_filter, max_rows, tenant_id, segment_id
       FROM mensageria.segment_data_entities
      WHERE is_active = true
        AND (tenant_id = $1 OR tenant_id IS NULL)
        AND (segment_id = $2::uuid OR segment_id IS NULL)`,
    [tenantId, segmentId],
  )

  // Dedupe por entity_name — se houver linha específica do tenant, ela vence sobre a do segmento.
  const byName = new Map<string, any>()
  for (const r of rows) {
    const existing = byName.get(r.entity_name)
    if (!existing || (r.tenant_id && !existing.tenant_id)) byName.set(r.entity_name, r)
  }

  return Array.from(byName.values()).map((r) => ({
    id: r.id,
    entityName: r.entity_name,
    tableName: r.table_name,
    description: r.description,
    columns: r.columns,
    relations: Array.isArray(r.relations) ? r.relations : [],
    tenantColumn: r.tenant_column,
    defaultFilter: r.default_filter,
    maxRows: r.max_rows,
  }))
}

/**
 * Monta a subquery escalar correlacionada de uma relation. Retorna null (relation
 * ignorada) se qualquer identificador for inválido — nunca deixa config ruim virar SQL.
 * `baseAlias` é o alias da entidade base na query externa (sempre 'e').
 */
function buildRelationSubquery(rel: EntityRelation, baseAlias: string): string | null {
  if (!ok(rel.name) || !ok(rel.bridge_table) || !ok(rel.bridge_fk) || !ok(rel.select_column)) return null
  const basePk = rel.base_pk ?? 'id'
  if (!ok(basePk)) return null

  let join = ''
  let projSource = 'br'
  if (rel.lookup_table) {
    const lookupPk = rel.lookup_pk ?? 'id'
    if (!ok(rel.lookup_table) || !ok(rel.lookup_fk) || !ok(lookupPk)) return null
    join = ` JOIN ${rel.lookup_table} lk ON lk.${lookupPk} = br.${rel.lookup_fk}`
    projSource = 'lk'
  }

  const proj = `${projSource}.${rel.select_column}`
  const corr = `br.${rel.bridge_fk} = ${baseAlias}.${basePk}`
  const from = `${rel.bridge_table} br${join}`
  const agg = rel.agg ?? 'array'

  if (agg === 'count') {
    return `(SELECT count(*)::int FROM ${from} WHERE ${corr}) AS ${rel.name}`
  }
  if (agg === 'first') {
    return `(SELECT ${proj} FROM ${from} WHERE ${corr} LIMIT 1) AS ${rel.name}`
  }
  // array (default) — one-to-many agregado, com teto de itens
  const cap = Math.min(Math.max(rel.max ?? 25, 1), 50)
  return `(SELECT array_agg(v) FROM (SELECT ${proj} AS v FROM ${from} WHERE ${corr} LIMIT ${cap}) s) AS ${rel.name}`
}

export async function resolveEntity(
  entity: SegmentDataEntity,
  params: Record<string, any>,
  ctx: { tenantId: string },
): Promise<any[]> {
  if (!ok(entity.tableName) || !ok(entity.tenantColumn)) {
    throw new Error(`segment_data_entities: identificador inválido para "${entity.entityName}"`)
  }
  const selectableCols = entity.columns.filter((c) => c.selectable && ok(c.name))
  if (selectableCols.length === 0) {
    throw new Error(`Entidade "${entity.entityName}" não tem colunas selecionáveis configuradas.`)
  }

  const args: any[] = [ctx.tenantId]
  const where: string[] = [`e.${entity.tenantColumn} = $1`]
  if (entity.defaultFilter) where.push(entity.defaultFilter)

  for (const [key, val] of Object.entries(params || {})) {
    if (val === null || val === undefined || val === '') continue
    const col = entity.columns.find((c) => c.name === key && c.filterable)
    if (!col || !ok(col.name)) continue // fora da whitelist — ignorado silenciosamente
    // Coerção server-side: o schema das ferramentas expõe todo filtro como string (LLMs
    // mandam "3" onde se esperaria 3, e providers estritos rejeitam a tool call por isso).
    // Aqui convertemos ao tipo real da coluna e descartamos valores que não coagem.
    if (col.type === 'number') {
      const n = Number(val)
      if (!Number.isFinite(n)) continue
      args.push(n)
      where.push(`e.${col.name} = $${args.length}`)
    } else if (col.type === 'boolean') {
      args.push(val === true || val === 'true' || val === '1' || val === 1)
      where.push(`e.${col.name} = $${args.length}`)
    } else {
      args.push(`%${val}%`)
      where.push(`e.${col.name} ILIKE $${args.length}`)
    }
  }

  const relationCols = (entity.relations || [])
    .map((r) => buildRelationSubquery(r, 'e'))
    .filter((s): s is string => s !== null)

  const projection = [...selectableCols.map((c) => `e.${c.name}`), ...relationCols].join(', ')

  const maxRows = Math.min(Math.max(entity.maxRows || 5, 1), 20)
  const sql = `SELECT ${projection}
                 FROM ${entity.tableName} e
                WHERE ${where.join(' AND ')}
                LIMIT ${maxRows}`
  const { rows } = await pool.query(sql, args)
  return rows
}

function buildParamsSchema(columns: EntityColumn[]): LlmToolDef['parameters'] {
  const properties: Record<string, any> = {}
  for (const c of columns.filter((c) => c.filterable)) {
    // Todo parâmetro é exposto como string — providers de tool-use validam o schema com
    // rigor variável (número vs string), e a coerção real acontece server-side no resolver.
    const kind = c.type === 'number' ? 'número' : c.type === 'boolean' ? 'booleano (true/false)' : 'texto'
    properties[c.name] = {
      type: 'string',
      description: `${c.description || c.name} — ${kind}`,
    }
  }
  return { type: 'object', properties, required: [] }
}

/** 1 entidade ativa → 1 ferramenta do LLM, gerada a partir do registro — sem tocar em código. */
export async function getToolsForSegment(
  segmentId: string | null,
  tenantId: string,
): Promise<{ tools: LlmToolDef[]; entities: Map<string, SegmentDataEntity> }> {
  const entities = await loadEntitiesForSegment(segmentId, tenantId)
  const entityMap = new Map(entities.map((e) => [`buscar_${e.entityName}`, e]))
  const tools: LlmToolDef[] = entities.map((e) => ({
    name: `buscar_${e.entityName}`,
    description: e.description || `Consulta dados de ${e.entityName}`,
    parameters: buildParamsSchema(e.columns),
  }))
  return { tools, entities: entityMap }
}

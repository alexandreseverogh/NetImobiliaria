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

export interface EntityColumn {
  name: string
  type: 'text' | 'number' | 'boolean'
  description?: string
  filterable?: boolean
  selectable?: boolean
  is_group_header?: boolean  // coluna que dá o cabeçalho/rótulo do item no agrupamento premium
                             // (ex.: titulo p/ imóvel, nome p/ clínica) — genérico por segmento
  // Coluna que é chave estrangeira (ex.: tipo_fk → tipos_imovel.id): presença de lookup_table
  // marca a coluna como "com lookup" — na exibição, o valor bruto (id) é resolvido pro nome
  // legível; no filtro, o LLM passa o NOME (texto), nunca o id, e o resolver casa via subquery.
  // Sem isso, um FK só pode ser tratado como número cru que o LLM não tem como preencher (ele
  // sabe "bangalô", não sabe que o id é 90) — o bot ou ignora o campo, ou (pior) finge que
  // filtrou. Genérico: qualquer segmento pode marcar qualquer FK dessa forma, sem código novo.
  lookup_table?: string
  lookup_pk?: string           // default 'id'
  lookup_label_column?: string // obrigatório se lookup_table setado (ex.: 'nome')
}

/**
 * Relação (tabela correlacionada) trazida como subquery escalar correlacionada — sem
 * fan-out na query principal. Suporta agregação one-to-many e multi-hop (tabela-ponte
 * → tabela de lookup do nome). Ex.: imovel → imovel_amenidades → amenidades.nome.
 */
export interface EntityRelation {
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
  is_image?: boolean           // marca a relation como lista de URLs de imagem — qualquer
                                // segmento/entidade pode usar (não amarrado a nome de campo nem
                                // a "imóvel"); é isso que o bot usa pra decidir o que virar
                                // mensagem de imagem de verdade em vez de texto/link
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
  identityColumn: string  // coluna de identidade/PK da entidade (default 'id') — configurável por
                           // entidade em vez de assumido fixo, pro casamento de linha↔item nos
                           // cartões (botAdapter.ts) funcionar mesmo se a PK não se chamar "id"
}

// Identificador SQL seguro — nunca interpolar nome de tabela/coluna sem passar por aqui.
const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/
const ok = (s: unknown): s is string => typeof s === 'string' && IDENT_RE.test(s)

// Escapa metacaracteres de regex antes de embutir texto livre (vindo do LLM) num padrão ~*.
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Padrão de "palavra inteira" (não substring) — usado no filtro de colunas com lookup. Sem isso,
// "disponível" bate como SUBSTRING dentro de "Indisponível" (significado oposto!) via ILIKE
// normal, e o filtro casa contra a categoria errada. `\y` (fronteira de palavra do Postgres)
// resolve isso: "disponível" não tem fronteira de palavra logo após o "in" de "indisponível"
// (ambos são caracteres de palavra), então não bate — mas ainda bate normalmente em "Bangalô",
// "Apartamento" etc.
function wordBoundaryPattern(val: string): string {
  return `\\y${escapeRegex(val)}\\y`
}

export async function loadEntitiesForSegment(segmentId: string | null, tenantId: string): Promise<SegmentDataEntity[]> {
  const { rows } = await pool.query(
    `SELECT id, entity_name, table_name, description, columns, relations, tenant_column, default_filter, max_rows, identity_column, tenant_id, segment_id
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
    identityColumn: r.identity_column || 'id',
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
  // array (default) — one-to-many agregado, com teto de itens. Descarta nulo/vazio na origem —
  // sem isso, uma linha-ponte sem valor real vira um `null` solto dentro do array (ex.: imóvel
  // sem foto com link CDN gera fotos:[null,null,...] em vez de fotos:[]), e um array "cheio de
  // null" engana o LLM: ele acha que tem conteúdo pra apresentar item a item quando não tem nada.
  const cap = Math.min(Math.max(rel.max ?? 25, 1), 50)
  return `(SELECT COALESCE(array_agg(v), ARRAY[]::text[]) FROM (SELECT ${proj}::text AS v FROM ${from} WHERE ${corr} AND ${proj} IS NOT NULL AND ${proj}::text <> '' LIMIT ${cap}) s) AS ${rel.name}`
}

/**
 * Coluna com lookup (FK): projeta o NOME legível (via subquery) em vez do id cru. Retorna null
 * (cai no `e.<col>` normal) se a config de lookup faltar ou tiver identificador inválido — nunca
 * quebra por config incompleta.
 */
function buildColumnProjection(col: EntityColumn, baseAlias: string): string | null {
  if (!col.lookup_table || !col.lookup_label_column) return null
  const lookupPk = col.lookup_pk ?? 'id'
  if (!ok(col.name) || !ok(col.lookup_table) || !ok(col.lookup_label_column) || !ok(lookupPk)) return null
  return `(SELECT lk.${col.lookup_label_column} FROM ${col.lookup_table} lk WHERE lk.${lookupPk} = ${baseAlias}.${col.name}) AS ${col.name}`
}

/** true quando a coluna tem config de lookup válida (mesma checagem usada na projeção). */
function hasValidLookup(col: EntityColumn): boolean {
  if (!col.lookup_table || !col.lookup_label_column) return false
  const lookupPk = col.lookup_pk ?? 'id'
  return ok(col.name) && ok(col.lookup_table) && ok(col.lookup_label_column) && ok(lookupPk)
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

    if (hasValidLookup(col)) {
      // Coluna FK com lookup: o LLM sempre manda o NOME (ex.: "bangalô"), nunca o id — casa por
      // subquery contra a tabela de lookup. Isso é o que torna o filtro real: se a categoria
      // EXISTE no catálogo mas nenhuma linha usa ela, o resultado vem genuinamente vazio (ex.:
      // "bangalô" existe em tipos_imovel, mas nenhum imóvel é desse tipo — filtro correto).
      //
      // Mas se o valor não corresponde a NENHUMA categoria real do catálogo DESTE TENANT, ele
      // não é um filtro legítimo — é o LLM generalizando/inventando (bug real observado:
      // pergunta genérica com "disponível" virou status_fk="disponível" que não existe no
      // catálogo deste tenant — o real é "Ativo" — mesmo a descrição pedindo pra não fazer
      // isso). Ignora o filtro nesse caso, em vez de forçar "nenhum resultado" incorreto —
      // instrução de texto sozinha não segura 100% dos casos, a checagem entra no código.
      //
      // CRÍTICO: catálogos de lookup (tipos_imovel, status_imovel, etc.) são por-tenant — a
      // checagem E o filtro têm que ser escopados pelo tenant, senão uma categoria de OUTRO
      // tenant (ex.: outro cliente também tem "Disponível" no catálogo dele) engana a checagem
      // de existência, e depois o filtro casa contra ids de catálogo de outro tenant — retorna
      // vazio pra este tenant mesmo quando a categoria equivalente dele (ex. "Ativo") é real.
      // Convenção: a tabela de lookup usa o MESMO nome de coluna de tenant da entidade base
      // (`entity.tenantColumn`, ex. 'tenant_id') — já validado como identificador seguro acima.
      // Palavra inteira (~*), não substring (ILIKE) — "disponível" não pode bater dentro de
      // "Indisponível" (ver wordBoundaryPattern acima).
      const lookupPk = col.lookup_pk ?? 'id'
      const pattern = wordBoundaryPattern(String(val))
      const categoryExists = await pool.query(
        `SELECT 1 FROM ${col.lookup_table} WHERE ${col.lookup_label_column} ~* $1 AND ${entity.tenantColumn} = $2 LIMIT 1`,
        [pattern, ctx.tenantId],
      )
      if (categoryExists.rows.length === 0) continue // valor não bate com nenhuma categoria real deste tenant — ignora
      args.push(pattern, ctx.tenantId)
      where.push(`e.${col.name} IN (SELECT ${lookupPk} FROM ${col.lookup_table} WHERE ${col.lookup_label_column} ~* $${args.length - 1} AND ${entity.tenantColumn} = $${args.length})`)
      continue
    }

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

  // A coluna de identidade sempre entra na projeção, mesmo se o Master esquecer de marcá-la
  // "mostra" no cadastro — sem isso, um erro de config quebraria silenciosamente o casamento
  // linha↔item nos cartões (botAdapter.ts), que depende de ler esse campo do resultado.
  const identityCol = entity.identityColumn || 'id'
  const identityAlreadyIncluded = selectableCols.some((c) => c.name === identityCol)
  const identityProjection = !identityAlreadyIncluded && ok(identityCol) ? [`e.${identityCol}`] : []

  const projection = [
    ...identityProjection,
    ...selectableCols.map((c) => buildColumnProjection(c, 'e') ?? `e.${c.name}`),
    ...relationCols,
  ].join(', ')

  const maxRows = Math.min(Math.max(entity.maxRows || 5, 1), 20)
  const sql = `SELECT ${projection}
                 FROM ${entity.tableName} e
                WHERE ${where.join(' AND ')}
                LIMIT ${maxRows}`
  const { rows } = await pool.query(sql, args)
  return rows
}

/**
 * Compara/ordena os resultados de uma entidade por 1+ campos numéricos e retorna só o(s)
 * item(ns) no extremo (menor ou maior) — a aritmética roda aqui, em código, nunca no LLM.
 *
 * Por quê: pedir pro LLM somar/comparar valores reais de vários itens numa resposta de texto
 * livre é a categoria de tarefa onde ele mais erra (chegou a inventar "IPTU aproximado" em vez
 * de usar o valor real disponível). Aqui ele só extrai QUAIS campos e QUAL operação a pergunta
 * pede — uma tarefa de classificação, que já faz bem — e o código faz a conta de verdade.
 *
 * Genérico por construção: `campos` só aceita nomes que já estão em
 * `entity.columns` com `type==='number' && selectable===true` — nenhum nome de campo/segmento
 * fixo. Reaproveita `resolveEntity` pra buscar as linhas candidatas (mesmos filtros normais,
 * mesmo escopo de tenant, mesmo maxRows — os parâmetros campos/operacao/criterio não batem
 * contra nenhuma coluna real e já são ignorados silenciosamente pelo loop de filtro existente).
 */
export async function compareEntity(
  entity: SegmentDataEntity,
  params: Record<string, any>,
  ctx: { tenantId: string },
): Promise<{ rows: any[]; camposUsados: string[]; operacao: string; criterio: string } | { error: string }> {
  const numericCols = new Set(entity.columns.filter((c) => c.type === 'number' && c.selectable).map((c) => c.name))
  const campos = String(params.campos || '')
    .split(',')
    .map((s) => s.trim())
    .filter((c) => numericCols.has(c))

  if (campos.length === 0) {
    return { error: 'Nenhum campo numérico válido foi especificado para a comparação.' }
  }

  const operacao = params.operacao === 'subtracao' || params.operacao === 'media' ? params.operacao : 'soma'
  const criterio = params.criterio === 'maior' ? 'maior' : 'menor'

  const rows = await resolveEntity(entity, params, ctx)

  const withTotal = rows
    .map((r) => {
      const vals = campos.map((c) => Number(r[c]))
      if (vals.some((v) => !Number.isFinite(v))) return null // linha sem dado suficiente — não estima, descarta
      let total: number
      if (operacao === 'subtracao') total = vals.reduce((a, b) => a - b)
      else if (operacao === 'media') total = vals.reduce((a, b) => a + b, 0) / vals.length
      else total = vals.reduce((a, b) => a + b, 0)
      return { ...r, _total_calculado: total }
    })
    .filter((r): r is any => r !== null)

  if (withTotal.length === 0) return { rows: [], camposUsados: campos, operacao, criterio }

  const totals = withTotal.map((r) => r._total_calculado as number)
  const best = criterio === 'menor' ? Math.min(...totals) : Math.max(...totals)
  const EPS = 0.005 // tolerância de arredondamento monetário — evita falso-empate por ponto flutuante
  const winners = withTotal.filter((r) => Math.abs((r._total_calculado as number) - best) < EPS)

  return { rows: winners, camposUsados: campos, operacao, criterio }
}

function buildParamsSchema(columns: EntityColumn[]): LlmToolDef['parameters'] {
  const properties: Record<string, any> = {}
  for (const c of columns.filter((c) => c.filterable)) {
    // Todo parâmetro é exposto como string — providers de tool-use validam o schema com
    // rigor variável (número vs string), e a coerção real acontece server-side no resolver.
    // Coluna com lookup: sempre "texto" pro LLM, mesmo se o `type` interno for número — o valor
    // esperado é o NOME (ex.: "bangalô"), nunca o id bruto da chave estrangeira.
    const kind = hasValidLookup(c) ? 'texto' : c.type === 'number' ? 'número' : c.type === 'boolean' ? 'booleano (true/false)' : 'texto'
    properties[c.name] = {
      type: 'string',
      description: `${c.description || c.name} — ${kind}`,
    }
  }
  return { type: 'object', properties, required: [] }
}

/**
 * Schema da ferramenta de comparação — os mesmos filtros de busca normais + campos/operacao/
 * critério. `campos` lista dinamicamente os nomes numéricos REAIS da entidade na descrição, pro
 * LLM saber quais valores são válidos sem ter que adivinhar.
 */
function buildCompareParamsSchema(columns: EntityColumn[]): LlmToolDef['parameters'] {
  const base = buildParamsSchema(columns)
  const numericNames = columns.filter((c) => c.type === 'number' && c.selectable).map((c) => c.name)
  return {
    type: 'object',
    properties: {
      ...base.properties,
      campos: {
        type: 'string',
        description: `Campo(s) numérico(s) a comparar, separados por vírgula se for mais de um. Valores válidos: ${numericNames.join(', ')}.`,
      },
      operacao: {
        type: 'string',
        description: `Como combinar os campos quando houver mais de um: "soma" (padrão), "subtracao" (1º campo menos os demais) ou "media".`,
      },
      criterio: {
        type: 'string',
        description: `"menor" (padrão) ou "maior" — qual extremo selecionar.`,
      },
    },
    required: ['campos'],
  }
}

/** 1 entidade ativa → 1 ferramenta do LLM, gerada a partir do registro — sem tocar em código. */
export async function getToolsForSegment(
  segmentId: string | null,
  tenantId: string,
): Promise<{ tools: LlmToolDef[]; entities: Map<string, SegmentDataEntity>; compareEntities: Map<string, SegmentDataEntity> }> {
  const entities = await loadEntitiesForSegment(segmentId, tenantId)
  const entityMap = new Map(entities.map((e) => [`buscar_${e.entityName}`, e]))

  // Ganha a ferramenta de comparação só quem tem pelo menos 1 coluna numérica selecionável —
  // derivado 100% de metadado já existente, nenhuma config nova, funciona pra qualquer segmento.
  const comparableEntities = entities.filter((e) => e.columns.some((c) => c.type === 'number' && c.selectable))
  const compareMap = new Map(comparableEntities.map((e) => [`comparar_${e.entityName}`, e]))

  const tools: LlmToolDef[] = [
    ...entities.map((e) => ({
      name: `buscar_${e.entityName}`,
      description: e.description || `Consulta dados de ${e.entityName}`,
      parameters: buildParamsSchema(e.columns),
    })),
    ...comparableEntities.map((e) => ({
      name: `comparar_${e.entityName}`,
      description: `Compara/ordena os resultados de "${e.entityName}" por um ou mais campos numéricos (somados, subtraídos ou em média) e retorna só o(s) item(ns) com o MENOR ou MAIOR valor. Use quando o visitante pedir uma comparação, ranking ou seleção entre vários itens (ex.: "qual tem o menor preço somando X e Y", "qual tem mais quartos") — a conta é feita de verdade pelo sistema, NUNCA calcule isso sozinho na sua resposta.`,
      parameters: buildCompareParamsSchema(e.columns),
    })),
  ]
  return { tools, entities: entityMap, compareEntities: compareMap }
}

import pool from '@/lib/database/connection'
import { resolveSegment } from '@/lib/intelligence/segmentResolver'

/**
 * Identificador SQL seguro — mesmo padrão já usado em src/app/api/crm/leads/route.ts pra
 * validar target_table/target_fk_column antes de qualquer interpolação em SQL cru.
 */
export const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/

export interface AtivoConfig {
  /**
   * Os 4 campos de "Vínculo Exato" são opcionais em conjunto — `null` quando o segmento/tenant
   * ainda não tem uma tabela real de inventário digitalizada (ex.: revendedora de carros sem
   * `veiculos` no banco). Nesse caso "Perfil de Interesse" (formSchemaJson) continua valendo
   * normalmente — os dois conceitos são independentes (docs/CHECKPOINT.md, 2026-08-14).
   */
  targetTable: string | null
  targetFkColumn: string | null
  targetNameColumn: string | null
  targetLabel: string | null
  layoutJson: any
  formSchemaJson: any[]
  /** De onde veio: override do próprio tenant, ou padrão curado pelo Master pro segmento. */
  source: 'tenant' | 'segment'
}

function rowToConfig(row: any, source: 'tenant' | 'segment'): AtivoConfig | null {
  if (!row) return null

  const targetTable = row.target_table || null
  const targetFkColumn = row.target_fk_column || null
  const targetNameColumn = row.target_name_column || null

  // Só valida/exige os 3 identificadores quando HÁ uma tabela declarada (Vínculo Exato
  // configurado) — quem usa este resolver confia cegamente nesses campos pra montar SQL.
  // Sem target_table, não há nada pra validar aqui: form_schema_json nunca é interpolado.
  if (targetTable) {
    const trioValido =
      IDENT_RE.test(targetTable) &&
      !!targetFkColumn && IDENT_RE.test(targetFkColumn) &&
      !!targetNameColumn && IDENT_RE.test(targetNameColumn)
    if (!trioValido) {
      console.error('[resolveAtivoConfig] config de Vínculo Exato incompleta/inválida, ignorada (Perfil de Interesse também fica indisponível):', row)
      return null
    }
  }

  return {
    targetTable,
    targetFkColumn,
    targetNameColumn,
    targetLabel: row.target_label || null,
    layoutJson: row.layout_json,
    formSchemaJson: row.form_schema_json || [],
    source,
  }
}

/**
 * Resolve a config do "ativo" (item de inventário vinculado a um lead — imóvel, veículo, etc.)
 * pro tenant informado: override do tenant, senão padrão curado pelo Master pro segmento dele,
 * senão `null` (segmento sem nenhuma config ainda — nunca inventa/herda de outro segmento).
 */
export async function resolveAtivoConfig(tenantId: string): Promise<AtivoConfig | null> {
  const tenantRes = await pool.query(
    `SELECT target_table, target_fk_column, target_name_column, target_label, layout_json, form_schema_json
       FROM crm_ativo_config_tenant
      WHERE tenant_id = $1::uuid AND is_active = true`,
    [tenantId]
  )
  if (tenantRes.rows[0]) return rowToConfig(tenantRes.rows[0], 'tenant')

  const segment = await resolveSegment(tenantId)
  if (!segment) return null

  const segmentRes = await pool.query(
    `SELECT target_table, target_fk_column, target_name_column, target_label, layout_json, form_schema_json
       FROM crm_ativo_config_segmento
      WHERE segment_id = $1::uuid AND is_active = true`,
    [segment.id]
  )
  return rowToConfig(segmentRes.rows[0], 'segment')
}

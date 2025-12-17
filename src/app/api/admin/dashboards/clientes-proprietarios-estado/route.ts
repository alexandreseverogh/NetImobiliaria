import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'

const ACCENTED = 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ'
const UNACCENTED = 'AAAAAEEEEIIIIOOOOOUUUUC'

const normalize = (alias: string) => `COALESCE(NULLIF(TRANSLATE(UPPER(TRIM(${alias})), '${ACCENTED}', '${UNACCENTED}'), ''), 'NAO INFORMADO')`

export async function GET(request: NextRequest): Promise<NextResponse> {
  const permissionCheck = await unifiedPermissionMiddleware(request)
  if (permissionCheck) return permissionCheck

  try {
    const query = `
      WITH clientes_norm AS (
        SELECT
          ${normalize('c.estado_fk::text')} AS estado,
          COUNT(*) AS total_clientes
        FROM clientes c
        GROUP BY 1
      ),
      proprietarios_norm AS (
        SELECT
          ${normalize('p.estado_fk::text')} AS estado,
          COUNT(*) AS total_proprietarios
        FROM proprietarios p
        GROUP BY 1
      ),
      imoveis_norm AS (
        SELECT
          ${normalize('i.estado_fk::text')} AS estado,
          SUM(CASE WHEN fi.tipo_destaque = 'DV' THEN 1 ELSE 0 END) AS destaque_venda,
          SUM(CASE WHEN fi.tipo_destaque = 'DA' THEN 1 ELSE 0 END) AS destaque_aluguel,
          COUNT(*) AS total_imoveis
        FROM imoveis i
        LEFT JOIN finalidades_imovel fi ON fi.id = i.finalidade_fk
        GROUP BY 1
      ),
      estados_unificados AS (
        SELECT estado FROM clientes_norm
        UNION
        SELECT estado FROM proprietarios_norm
        UNION
        SELECT estado FROM imoveis_norm
      )
      SELECT
        eu.estado,
        COALESCE(c.total_clientes, 0)::text AS clientes,
        COALESCE(p.total_proprietarios, 0)::text AS proprietarios,
        COALESCE(i.destaque_venda, 0)::text AS destaque_venda,
        COALESCE(i.destaque_aluguel, 0)::text AS destaque_aluguel,
        COALESCE(i.total_imoveis, 0)::text AS total_imoveis
      FROM estados_unificados eu
      LEFT JOIN clientes_norm c ON c.estado = eu.estado
      LEFT JOIN proprietarios_norm p ON p.estado = eu.estado
      LEFT JOIN imoveis_norm i ON i.estado = eu.estado
      ORDER BY eu.estado;
    `

    const result = await pool.query(query)

    console.log('clientes-proprietarios-estado -> linhas retornadas:', result.rows.length)

    const data = result.rows.map((row: any) => ({
      state: row.estado ?? '',
      stateName: row.estado ?? '',
      clientes: Number(row.clientes ?? 0),
      proprietarios: Number(row.proprietarios ?? 0),
      destaqueVenda: Number(row.destaque_venda ?? 0),
      destaqueAluguel: Number(row.destaque_aluguel ?? 0),
      totalImoveis: Number(row.total_imoveis ?? 0)
    }))

    return NextResponse.json(data)
  } catch (error) {
    console.error('Erro ao carregar totais por estado (clientes/proprietarios):', error)
    return NextResponse.json({ error: 'Erro ao carregar totais por estado' }, { status: 500 })
  }
}

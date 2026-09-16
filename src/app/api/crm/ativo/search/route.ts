import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenFromRequest, verifyToken } from '@/lib/auth/jwt'
import { resolveAtivoConfig, IDENT_RE } from '@/lib/crm/resolveAtivoConfig'

/**
 * Busca genérica no "ativo" do segmento/tenant (imóvel, veículo, etc) — substitui o antigo
 * /api/crm/imoveis/search, hardcoded a imóveis. Mesmo gate leve de /api/crm/ativo/config
 * (qualquer usuário autenticado do tenant, não exige permissão de config). target_table/
 * target_fk_column/target_name_column só chegam aqui já validados por resolveAtivoConfig —
 * revalidados de novo antes de interpolar em SQL (defesa em profundidade).
 */
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
    }
    const decoded = await verifyToken(token)
    if (!decoded?.tenantId) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || '').trim()
    if (q.length < 2) {
      return NextResponse.json({ success: true, items: [] })
    }

    const config = await resolveAtivoConfig(decoded.tenantId)
    if (!config || !config.targetTable) {
      // Sem tabela de Vínculo Exato configurada — busca honesta vazia, nunca quebra.
      return NextResponse.json({ success: true, items: [] })
    }

    const { targetTable, targetNameColumn } = config
    if (!IDENT_RE.test(targetTable) || !targetNameColumn || !IDENT_RE.test(targetNameColumn)) {
      return NextResponse.json({ success: false, error: 'Config inválida' }, { status: 500 })
    }

    const { rows } = await pool.query(
      `SELECT id, ${targetNameColumn} AS nome
         FROM ${targetTable}
        WHERE tenant_id = $1::uuid
          AND (${targetNameColumn}::text ILIKE $2 OR id::text = $3)
        ORDER BY ${targetNameColumn} ASC
        LIMIT 10`,
      [decoded.tenantId, `%${q}%`, q]
    )

    return NextResponse.json({ success: true, items: rows })
  } catch (error: any) {
    console.error('❌ [crm/ativo/search] Erro:', error)
    return NextResponse.json({ success: false, error: 'Erro interno' }, { status: 500 })
  }
}

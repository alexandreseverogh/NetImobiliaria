import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyToken, getTokenFromRequest } from '@/lib/auth/jwt'

/**
 * GET /api/admin/segments
 *
 * Lista os segmentos de negócio ativos — versão enxuta e não-Master, para popular um <select>
 * (ex.: escolher o segmento de negócios de um CLIENTE em /admin/clientes). Diferente de:
 *   - GET /api/admin/master/segments: Master-only, retorna config completa (benchmarks,
 *     módulos, etc.), não serve pra um tenant-admin comum.
 *   - GET /api/admin/campanhas/segments: filtra só segmentos com campanha ativa no período —
 *     inútil aqui, um cliente recém-criado nunca teria campanha ainda.
 *
 * Só exige sessão de tenant válida (qualquer role), sem gate de módulo — a lista em si (nome/
 * ícone/cor de segmentos ativos) não é dado sensível.
 */
export async function GET(request: NextRequest) {
  const token = getTokenFromRequest(request)
  const decoded = token ? await verifyToken(token) : null

  if (!decoded?.tenantId && !decoded?.is_system_role) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  try {
    const { rows } = await pool.query(
      `SELECT id, name, slug, icon, color_theme
         FROM public.system_segments
        WHERE is_active = true
        ORDER BY name ASC`,
    )
    return NextResponse.json({ segments: rows })
  } catch (error) {
    console.error('❌ Erro ao listar segmentos:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

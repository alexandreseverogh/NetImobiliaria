import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import pool from '@/lib/database/connection'

/**
 * Top 10 funcionalidades mais acessadas por administradores de empresa — alimenta o
 * gráfico de pizza ao lado da tabela de Log de Acessos. Respeita os mesmos filtros de
 * período/empresa/administrador já aplicados na tabela (nunca o filtro de
 * funcionalidade — não faz sentido pedir "top funcionalidades" já filtrado por 1 só).
 *
 * O percentual de cada fatia é sobre o TOTAL GERAL de acessos admin do período/filtro
 * (todas as funcionalidades, não só as 10 exibidas) — por isso as 10 fatias nem sempre
 * somam 100%.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value
  const decoded = token ? await verifyToken(token) : null

  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const tenantId = searchParams.get('tenantId')
    const userId = searchParams.get('userId')

    const conditions: string[] = [
      `EXISTS (
        SELECT 1 FROM public.user_tenant_membership utm
        JOIN public.user_roles ur ON ur.id = utm.role_id
        WHERE utm.user_id = fal.user_id
          AND utm.tenant_id = fal.tenant_id
          AND ur.is_system_role = false
          AND ur.name ILIKE '%admin%'
      )`,
    ]
    const params: any[] = []
    let i = 0

    if (startDate) {
      i++
      conditions.push(`fal.accessed_at >= $${i}::timestamp`)
      params.push(startDate)
    }
    if (endDate) {
      i++
      conditions.push(`fal.accessed_at <= $${i}::timestamp + interval '1 day'`)
      params.push(endDate)
    }
    if (tenantId) {
      i++
      conditions.push(`fal.tenant_id = $${i}`)
      params.push(tenantId)
    }
    if (userId) {
      i++
      conditions.push(`fal.user_id = $${i}`)
      params.push(userId)
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`

    const [totalResult, topResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS total FROM public.feature_access_logs fal ${whereClause}`,
        params
      ),
      pool.query(
        `
          SELECT
            COALESCE(fal.feature_name, fal.route) AS label,
            fal.feature_slug,
            COUNT(*)::int AS count
          FROM public.feature_access_logs fal
          ${whereClause}
          GROUP BY COALESCE(fal.feature_name, fal.route), fal.feature_slug
          ORDER BY count DESC
          LIMIT 10
        `,
        params
      ),
    ])

    const totalAccesses = parseInt(totalResult.rows[0].total, 10)

    return NextResponse.json({
      items: topResult.rows,
      totalAccesses,
    })
  } catch (error) {
    console.error('❌ Erro ao buscar top funcionalidades do log de acessos:', error)
    return NextResponse.json({ error: 'Erro ao carregar top funcionalidades' }, { status: 500 })
  }
}

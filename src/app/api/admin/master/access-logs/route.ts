import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import pool from '@/lib/database/connection'

/**
 * Log de acesso a funcionalidade — restrito a ADMINISTRADORES de empresa (tenant).
 * Nunca mostra o próprio Master navegando, nem usuários do tenant com outro papel
 * (corretor, atendente, etc.) — a visualização desta página é exclusivamente sobre
 * quem administra cada empresa, por decisão explícita do usuário.
 *
 * Consumida pela aba "Log de Acessos" dentro de /admin/master/usuarios (feature
 * "Administradores das Empresas", categoria Master Governance). Master-only.
 */
const PAGE_SIZE = 20

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
    const featureSlug = searchParams.get('featureSlug')
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = PAGE_SIZE
    const offset = (page - 1) * limit

    // Sempre presente, em toda consulta desta rota — é o que restringe a visualização
    // só a usuários que são ADMINISTRADOR do tenant no momento (nunca Master, nunca
    // outro papel). Mesma definição de "admin de tenant" já usada no resto da
    // plataforma (role.name ILIKE '%admin%', ver docs/ACCESS_CONTROL.md).
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
    if (featureSlug) {
      i++
      conditions.push(`fal.feature_slug = $${i}`)
      params.push(featureSlug)
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`

    const countResult = await pool.query(
      `
        SELECT COUNT(*) AS total
        FROM public.feature_access_logs fal
        ${whereClause}
      `,
      params
    )
    const total = parseInt(countResult.rows[0].total, 10)

    i++
    const limitIdx = i
    params.push(limit)
    i++
    const offsetIdx = i
    params.push(offset)

    const dataResult = await pool.query(
      `
        SELECT
          fal.id,
          fal.accessed_at,
          fal.route,
          fal.feature_id,
          fal.feature_name,
          fal.feature_slug,
          u.id AS user_id,
          u.nome AS user_nome,
          u.email AS user_email,
          t.id AS tenant_id,
          t.name AS tenant_name,
          -- Diferente do Portfolio (que filtra base64 por volume de linhas), aqui são no
          -- máximo 20 linhas/página — os 3 tenants reais testados guardam a logo como
          -- data: URI embutido (24-103KB), não como URL leve. Mostrar a logo real
          -- (pedido explícito) importa mais que a economia de payload nesta tela.
          t.logo_url AS tenant_logo_url
        FROM public.feature_access_logs fal
        LEFT JOIN public.users u ON fal.user_id = u.id
        LEFT JOIN public.tenants t ON fal.tenant_id = t.id
        ${whereClause}
        ORDER BY fal.accessed_at DESC
        LIMIT $${limitIdx} OFFSET $${offsetIdx}
      `,
      params
    )

    return NextResponse.json({
      logs: dataResult.rows,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    })
  } catch (error) {
    console.error('❌ Erro ao buscar logs de acesso:', error)
    return NextResponse.json({ error: 'Erro ao carregar log de acessos' }, { status: 500 })
  }
}

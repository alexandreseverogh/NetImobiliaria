import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'
import pool from '@/lib/database/connection'

/**
 * Opções de filtro da aba "Log de Acessos" (Empresa, Administrador, Funcionalidade) —
 * derivadas só do que já foi de fato acessado por um ADMINISTRADOR de empresa (nunca
 * Master, nunca outro papel do tenant), em ordem alfabética. Mesmo join de papel usado
 * em /api/admin/master/access-logs, pra nunca oferecer uma opção que a listagem
 * principal não reconheceria.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value
  const decoded = token ? await verifyToken(token) : null

  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 })
  }

  try {
    const [tenantsResult, adminsResult, featuresResult] = await Promise.all([
      pool.query(`
        SELECT DISTINCT t.id, t.name
        FROM public.feature_access_logs fal
        JOIN public.tenants t ON t.id = fal.tenant_id
        WHERE EXISTS (
          SELECT 1 FROM public.user_tenant_membership utm
          JOIN public.user_roles ur ON ur.id = utm.role_id
          WHERE utm.user_id = fal.user_id
            AND utm.tenant_id = fal.tenant_id
            AND ur.is_system_role = false
            AND ur.name ILIKE '%admin%'
        )
        ORDER BY t.name ASC
      `),
      pool.query(`
        SELECT DISTINCT u.id, u.nome
        FROM public.feature_access_logs fal
        JOIN public.users u ON u.id = fal.user_id
        WHERE EXISTS (
          SELECT 1 FROM public.user_tenant_membership utm
          JOIN public.user_roles ur ON ur.id = utm.role_id
          WHERE utm.user_id = fal.user_id
            AND utm.tenant_id = fal.tenant_id
            AND ur.is_system_role = false
            AND ur.name ILIKE '%admin%'
        )
        ORDER BY u.nome ASC
      `),
      pool.query(`
        SELECT DISTINCT fal.feature_slug, fal.feature_name
        FROM public.feature_access_logs fal
        WHERE fal.feature_slug IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.user_tenant_membership utm
            JOIN public.user_roles ur ON ur.id = utm.role_id
            WHERE utm.user_id = fal.user_id
              AND utm.tenant_id = fal.tenant_id
              AND ur.is_system_role = false
              AND ur.name ILIKE '%admin%'
          )
        ORDER BY fal.feature_name ASC
      `),
    ])

    return NextResponse.json({
      tenants: tenantsResult.rows,
      admins: adminsResult.rows,
      features: featuresResult.rows,
    })
  } catch (error) {
    console.error('❌ Erro ao listar filtros do log de acessos:', error)
    return NextResponse.json({ error: 'Erro ao carregar filtros' }, { status: 500 })
  }
}

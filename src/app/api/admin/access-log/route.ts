import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getTokenPayload } from '@/lib/auth/jwt-node'
import { extractRequestData } from '@/lib/utils/ipUtils'

/**
 * Log de acesso a funcionalidade — 1 registro por tela de página visitada por um
 * usuário autenticado do admin (granularidade de navegação, não de chamada de API —
 * decisão de volume tomada com o usuário em 2026-10-12).
 *
 * Disparado fire-and-forget pelo hook `useFeatureAccessLog` a cada troca de pathname
 * dentro de AdminLayoutContent. Nunca bloqueia nem afeta a UX — qualquer falha aqui é
 * só logada no servidor, igual ao padrão já usado em `logAuditEvent`.
 */
export async function POST(request: NextRequest) {
  try {
    const payload = getTokenPayload(request)
    if (!payload?.userId) {
      // Sessão inválida/expirada — não há quem atribuir o acesso. Resposta neutra,
      // sem forçar o client a tratar erro (ele já ignora a resposta de qualquer forma).
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const route: string | undefined = body?.route
    // /admin e /crm são os 2 layouts protegidos da plataforma (CRMLayoutContent é
    // separado de AdminLayoutContent, cada um com seu próprio hook de captura).
    const isValidRoute = typeof route === 'string' && (route.startsWith('/admin') || route.startsWith('/crm'))
    if (!route || !isValidRoute) {
      return NextResponse.json({ ok: false, error: 'route inválida' }, { status: 400 })
    }

    const tenantId = (payload as any).tenantId ?? null

    // Resolve a feature correspondente à rota de página — mesma lógica de match
    // (exato, depois regex para [id]/[slug]) já usada pelo unifiedPermissionMiddleware,
    // só que aplicada aqui a `route_permissions_config` com method='GET'.
    const featureResult = await pool.query(
      `
        SELECT sf.id AS feature_id, sf.name AS feature_name, sf.slug AS feature_slug
        FROM route_permissions_config rpc
        LEFT JOIN system_features sf ON rpc.feature_id = sf.id
        WHERE rpc.is_active = true
          AND rpc.method = 'GET'
          AND (
            rpc.route_pattern = $1
            OR $1 ~ ('^' || REPLACE(REPLACE(rpc.route_pattern, '[id]', '[^/]+'), '[slug]', '[^/]+') || '$')
          )
        ORDER BY
          CASE WHEN rpc.route_pattern = $1 THEN 0 ELSE 1 END,
          LENGTH(rpc.route_pattern) DESC
        LIMIT 1
      `,
      [route]
    )

    const feature = featureResult.rows[0] ?? null
    // '/admin' (raiz) é a tela de boas-vindas pós-login — deliberadamente sem
    // system_features própria (ver src/app/admin/page.tsx, comentário de topo), então
    // nunca vai resolver via route_permissions_config. Único fallback de texto fixo
    // desta rota — qualquer outra página sem nome legível indica mapeamento faltando
    // de verdade (ver migration-2026-10-12-route-permissions-full-audit.sql).
    const featureName = feature?.feature_name ?? (route === '/admin' ? 'Página Inicial' : null)
    const featureSlug = feature?.feature_slug ?? (route === '/admin' ? 'pagina-inicial' : null)
    const { ipAddress, userAgent } = extractRequestData(request)

    await pool.query(
      `
        INSERT INTO public.feature_access_logs (
          user_id, tenant_id, feature_id, feature_name, feature_slug,
          route, ip_address, user_agent, accessed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      `,
      [
        payload.userId,
        tenantId,
        feature?.feature_id ?? null,
        featureName,
        featureSlug,
        route,
        ipAddress || null,
        userAgent || null,
      ]
    )

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('❌ Erro ao registrar log de acesso (não crítico):', error)
    // Nunca propaga erro — é telemetria, não uma operação de negócio.
    return NextResponse.json({ ok: false }, { status: 200 })
  }
}

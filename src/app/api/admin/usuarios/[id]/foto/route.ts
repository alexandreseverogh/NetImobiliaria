import { NextRequest, NextResponse } from 'next/server'
import { getTokenFromRequest, verifyToken } from '@/lib/auth/jwt'
import { getS3Url } from '@/lib/storage/s3-client'
import pool from '@/lib/database/connection'

export const dynamic = 'force-dynamic'

/**
 * Streaming da foto de um usuário — mesmo padrão de GET /api/public/imagens/[id] (imóveis):
 * consulta leve de metadados primeiro (nunca carrega o bytea à toa); se storage_type='s3',
 * redireciona 302 direto pro MinIO/CDN (zero CPU/banda no app); senão, faz streaming do
 * bytea como fallback legado.
 *
 * Auth: NÃO usa `unifiedPermissionMiddleware` sozinho (achado real ao expor este endpoint pro
 * Kanban do CRM: essa rota nunca foi registrada em `route_permissions_config`, então o
 * middleware sempre retorna `null` — fail-open, sem nenhuma checagem de fato, mesma classe de
 * vazamento já corrigida em `/api/crm/clientes/search` numa sessão anterior). Também não usa
 * `requireApiPermission(..., 'usuarios', 'READ')` como as rotas de gestão — exigir a permissão
 * de CRUD de usuários bloquearia um Atendente/Corretor comum de ver o avatar de um colega no
 * Kanban, quebrando o próprio consumidor deste endpoint. Gate correto: JWT válido de verdade
 * (verifyToken, não só formato) + o usuário-alvo pertence ao MESMO tenant de quem pede (via
 * `user_tenant_membership`) — Master vê qualquer foto, igual ao resto da plataforma.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = getTokenFromRequest(request)
    if (!token) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const decoded = await verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 })
    }

    const userId = params.id
    const isMaster = decoded.is_system_role === true

    if (!isMaster) {
      const sameTenant = await pool.query(
        `SELECT 1
           FROM user_tenant_membership requester
           JOIN user_tenant_membership target ON target.tenant_id = requester.tenant_id
          WHERE requester.user_id = $1 AND target.user_id = $2
          LIMIT 1`,
        [decoded.userId, userId]
      )
      if (sameTenant.rowCount === 0) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
      }
    }

    const metaQuery = 'SELECT storage_type, s3_key, url_cdn, foto_tipo_mime FROM users WHERE id = $1'
    const metaResult = await pool.query(metaQuery, [userId])

    if (metaResult.rowCount === 0) {
      return new NextResponse('Usuário não encontrado', { status: 404 })
    }

    const meta = metaResult.rows[0]

    if (meta.storage_type === 's3' && (meta.url_cdn || meta.s3_key)) {
      const redirectUrl = meta.url_cdn || getS3Url(meta.s3_key)
      if (redirectUrl) {
        return NextResponse.redirect(redirectUrl, {
          status: 302,
          headers: { 'Cache-Control': 'private, max-age=3600' },
        })
      }
    }

    const query = 'SELECT foto, foto_tipo_mime FROM users WHERE id = $1'
    const result = await pool.query(query, [userId])

    if (result.rowCount === 0 || !result.rows[0].foto) {
      return new NextResponse('Foto não encontrada', { status: 404 })
    }

    return new NextResponse(result.rows[0].foto, {
      headers: {
        'Content-Type': result.rows[0].foto_tipo_mime || 'image/jpeg',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (error) {
    console.error('Erro ao servir foto de usuário:', error)
    return new NextResponse('Erro interno do servidor', { status: 500 })
  }
}

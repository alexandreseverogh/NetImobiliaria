import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { deleteFromS3 } from '@/lib/storage/s3-client'

/**
 * Remoção de um anexo específico de uma atividade (não a atividade inteira — ver
 * DELETE /api/crm/atividades pra isso). Hard delete de verdade (não soft-delete): um anexo
 * errado ou trocado não é "estado de negócio" a preservar, é lixo — mesmo padrão de
 * `deleteImovelImagem`/`deleteFromS3` best-effort já usado no projeto pra outros anexos.
 */

function getCurrentUser(request: NextRequest): { userId: string, tenantId?: string, is_system_role?: boolean } | null {
  try {
    const token = request.cookies.get('admin_auth_token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return null
    const decoded = verifyTokenNode(token) as any
    if (!decoded) return null
    return {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      is_system_role: decoded.is_system_role === true,
    }
  } catch {
    return null
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser?.tenantId && !currentUser?.is_system_role) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    const isMaster = currentUser.is_system_role === true

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id necessário' }, { status: 400 })

    // Isolamento por tenant via JOIN com atividades_lead — o anexo em si não carrega tenant_id
    // confiável o bastante sem checar contra a atividade dona (mesma disciplina de sempre
    // resolver o escopo a partir da entidade pai, nunca do que o client mandaria).
    const { rows } = await pool.query(
      `DELETE FROM atividade_lead_anexos an
        USING atividades_lead a
        WHERE an.id = $1 AND an.atividade_id = a.id AND a.deleted_at IS NULL
          ${!isMaster ? 'AND an.tenant_id = $2' : ''}
        RETURNING an.id, an.s3_key, a.lead_uuid`,
      !isMaster ? [id, currentUser.tenantId] : [id],
    )
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Anexo não encontrado ou sem permissão.' }, { status: 404 })
    }

    const s3Key = rows[0].s3_key as string | null
    if (s3Key) {
      deleteFromS3(s3Key).catch((err) => {
        console.error('[crm/atividades/anexos] falha ao remover objeto do storage (não bloqueante):', err)
      })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('DELETE /crm/atividades/anexos error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

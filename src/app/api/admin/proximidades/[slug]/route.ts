import { NextRequest, NextResponse } from 'next/server'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import { findProximidadeBySlug, updateProximidadeBySlug, deleteProximidadeBySlug } from '@/lib/database/proximidades'
import { logAuditEvent, extractUserIdFromToken } from '@/lib/audit/auditLogger'
import { extractRequestData } from '@/lib/utils/ipUtils'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) return permissionCheck

    const { slug } = params

    const proximidade = await findProximidadeBySlug(slug)
    if (!proximidade) {
      return NextResponse.json(
        { error: 'Proximidade não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: proximidade
    })
  } catch (error) {
    console.error('Erro ao buscar proximidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) return permissionCheck

    const { slug } = params
    const body = await request.json()
    const { nome, categoria_id, descricao, status, icone } = body

    if (!nome || !categoria_id) {
      return NextResponse.json(
        { error: 'Nome e categoria são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar dados atuais para auditoria
    const proximidadeAtual = await findProximidadeBySlug(slug)
    if (!proximidadeAtual) {
      return NextResponse.json(
        { error: 'Proximidade não encontrada' },
        { status: 404 }
      )
    }

    // Mapear status para ativo (backend usa ativo, frontend usa status)
    // Se status for undefined, manter o valor atual
    const ativo = status !== undefined ? (status === 'Ativo') : undefined

    const proximidadeAtualizada = await updateProximidadeBySlug(slug, {
      nome,
      categoria_id,
      descricao,
      icone,
      ativo
    })

    // Log de auditoria (não crítico - falha não afeta operação)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)
      
      await logAuditEvent({
        userId,
        action: 'UPDATE',
        resource: 'proximidades',
        resourceId: proximidadeAtualizada.id,
        details: {
          antes: {
            nome: proximidadeAtual.nome,
            descricao: proximidadeAtual.descricao,
            categoria_id: proximidadeAtual.categoria_id,
            ativo: proximidadeAtual.ativo,
            popular: proximidadeAtual.popular,
            ordem: proximidadeAtual.ordem
          },
          depois: {
            nome: proximidadeAtualizada.nome,
            descricao: proximidadeAtualizada.descricao,
            categoria_id: proximidadeAtualizada.categoria_id,
            ativo: proximidadeAtualizada.ativo,
            popular: proximidadeAtualizada.popular,
            ordem: proximidadeAtualizada.ordem
          }
        },
        ipAddress,
        userAgent
      })
    } catch (auditError) {
      // Log do erro mas não falha a operação principal
      console.error('❌ Erro na auditoria (não crítico):', auditError)
    }

    return NextResponse.json({
      success: true,
      data: proximidadeAtualizada
    })
  } catch (error) {
    console.error('Erro ao atualizar proximidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) return permissionCheck

    const { slug } = params
    console.log('🗑️ API: Tentando excluir proximidade com slug:', slug)

    // Buscar dados da proximidade antes de excluir para auditoria
    const proximidade = await findProximidadeBySlug(slug)
    if (!proximidade) {
      return NextResponse.json(
        { error: 'Proximidade não encontrada' },
        { status: 404 }
      )
    }

    await deleteProximidadeBySlug(slug)
    console.log('✅ API: Proximidade excluída com sucesso')

    // Log de auditoria (não crítico - falha não afeta operação)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)
      
      await logAuditEvent({
        userId,
        action: 'DELETE',
        resource: 'proximidades',
        resourceId: proximidade.id,
        details: {
          nome: proximidade.nome,
          descricao: proximidade.descricao,
          categoria_id: proximidade.categoria_id,
          ativo: proximidade.ativo,
          popular: proximidade.popular,
          ordem: proximidade.ordem,
          deleted_at: new Date().toISOString()
        },
        ipAddress,
        userAgent
      })
    } catch (auditError) {
      // Log do erro mas não falha a operação principal
      console.error('❌ Erro na auditoria (não crítico):', auditError)
    }

    return NextResponse.json({
      success: true,
      message: 'Proximidade excluída com sucesso'
    })
  } catch (error) {
    console.error('❌ API: Erro ao excluir proximidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

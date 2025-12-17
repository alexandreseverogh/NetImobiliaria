import { NextRequest, NextResponse } from 'next/server'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import { findAmenidadeBySlug, updateAmenidadeBySlug, deleteAmenidadeBySlug } from '@/lib/database/amenidades'
import { logAuditEvent, extractUserIdFromToken } from '@/lib/audit/auditLogger'
import { extractRequestData } from '@/lib/utils/ipUtils'

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params

    const amenidade = await findAmenidadeBySlug(slug)
    if (!amenidade) {
      return NextResponse.json(
        { error: 'Amenidade não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: amenidade
    })
  } catch (error) {
    console.error('Erro ao buscar amenidade:', error)
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
    const { slug } = params
    const body = await request.json()
    const { nome, categoria_id, descricao, status } = body

    if (!nome || !categoria_id) {
      return NextResponse.json(
        { error: 'Nome e categoria são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar dados antigos para auditoria
    const amenidadeAntiga = await findAmenidadeBySlug(slug)

    // Mapear status para ativo (backend usa ativo, frontend usa status)
    // Se status for undefined, manter o valor atual
    const ativo = status !== undefined ? (status === 'Ativo') : undefined

    const amenidadeAtualizada = await updateAmenidadeBySlug(slug, {
      nome,
      categoria_id,
      descricao,
      ativo
    })

    // Log de auditoria (não crítico - falha não afeta operação)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)
      
      await logAuditEvent({
        userId,
        action: 'UPDATE',
        resource: 'amenidades',
        resourceId: amenidadeAtualizada.id,
        details: {
          nome: amenidadeAtualizada.nome,
          descricao: amenidadeAtualizada.descricao,
          categoria_id: amenidadeAtualizada.categoria_id,
          ativo: amenidadeAtualizada.ativo,
          popular: amenidadeAtualizada.popular,
          ordem: amenidadeAtualizada.ordem,
          changes: {
            nome: amenidadeAntiga?.nome !== amenidadeAtualizada.nome ? { from: amenidadeAntiga?.nome, to: amenidadeAtualizada.nome } : undefined,
            descricao: amenidadeAntiga?.descricao !== amenidadeAtualizada.descricao ? { from: amenidadeAntiga?.descricao, to: amenidadeAtualizada.descricao } : undefined,
            categoria_id: amenidadeAntiga?.categoria_id !== amenidadeAtualizada.categoria_id ? { from: amenidadeAntiga?.categoria_id, to: amenidadeAtualizada.categoria_id } : undefined,
            ativo: amenidadeAntiga?.ativo !== amenidadeAtualizada.ativo ? { from: amenidadeAntiga?.ativo, to: amenidadeAtualizada.ativo } : undefined
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
      data: amenidadeAtualizada
    })
  } catch (error) {
    console.error('Erro ao atualizar amenidade:', error)
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
    const { slug } = params
    console.log('🗑️ API: Tentando excluir amenidade com slug:', slug)

    // Buscar dados da amenidade antes de excluir para auditoria
    const amenidade = await findAmenidadeBySlug(slug)
    
    if (!amenidade) {
      return NextResponse.json(
        { error: 'Amenidade não encontrada' },
        { status: 404 }
      )
    }
    
    await deleteAmenidadeBySlug(slug)
    console.log('✅ API: Amenidade excluída com sucesso')

    // Log de auditoria (não crítico - falha não afeta operação)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)
      
      await logAuditEvent({
        userId,
        action: 'DELETE',
        resource: 'amenidades',
        resourceId: amenidade.id,
        details: {
          nome: amenidade.nome,
          descricao: amenidade.descricao,
          categoria_id: amenidade.categoria_id,
          ativo: amenidade.ativo,
          popular: amenidade.popular,
          ordem: amenidade.ordem,
          slug,
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
      message: 'Amenidade excluída com sucesso'
    })
  } catch (error) {
    console.error('❌ API: Erro ao excluir amenidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

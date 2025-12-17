import { NextRequest, NextResponse } from 'next/server'
import { findStatusImovelById, updateStatusImovel, deleteStatusImovel } from '@/lib/database/status-imovel'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import { logAuditEvent, extractUserIdFromToken } from '@/lib/audit/auditLogger'
import { extractRequestData } from '@/lib/utils/ipUtils'

// GET - Buscar status de imóvel por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const statusImovel = await findStatusImovelById(id)
    if (!statusImovel) {
      return NextResponse.json(
        { error: 'Status de imóvel não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: statusImovel
    })

  } catch (error) {
    console.error('Erro ao buscar status de imóvel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar status de imóvel
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { nome, cor, descricao, ativo, consulta_imovel_internauta } = body

    // Buscar dados ANTES da atualização para auditoria
    const statusAntes = await findStatusImovelById(id)
    
    if (!statusAntes) {
      return NextResponse.json(
        { error: 'Status de imóvel não encontrado' },
        { status: 404 }
      )
    }

    const statusImovelAtualizado = await updateStatusImovel(id, {
      nome,
      cor,
      descricao,
      ativo,
      consulta_imovel_internauta
    })

    // Log de auditoria com before/after (não crítico)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)
      
      // Montar objeto de mudanças
      const changes: Record<string, { before: any; after: any }> = {}
      
      if (statusAntes.nome !== statusImovelAtualizado.nome) {
        changes.nome = { before: statusAntes.nome, after: statusImovelAtualizado.nome }
      }
      if (statusAntes.cor !== statusImovelAtualizado.cor) {
        changes.cor = { before: statusAntes.cor, after: statusImovelAtualizado.cor }
      }
      if (statusAntes.descricao !== statusImovelAtualizado.descricao) {
        changes.descricao = { 
          before: statusAntes.descricao || '', 
          after: statusImovelAtualizado.descricao || '' 
        }
      }
      if (statusAntes.ativo !== statusImovelAtualizado.ativo) {
        changes.ativo = { before: statusAntes.ativo, after: statusImovelAtualizado.ativo }
      }
      if (statusAntes.consulta_imovel_internauta !== statusImovelAtualizado.consulta_imovel_internauta) {
        changes.consulta_imovel_internauta = { 
          before: statusAntes.consulta_imovel_internauta, 
          after: statusImovelAtualizado.consulta_imovel_internauta 
        }
      }
      
      await logAuditEvent({
        userId,
        action: 'UPDATE',
        resource: 'status-imovel',
        resourceId: statusImovelAtualizado.id,
        details: {
          description: `Atualizou status de imóvel "${statusImovelAtualizado.nome}"`,
          changes,
          updated_by: userId
        },
        ipAddress,
        userAgent
      })
    } catch (auditError) {
      console.error('❌ Erro na auditoria (não crítico):', auditError)
    }

    return NextResponse.json({
      success: true,
      data: statusImovelAtualizado
    })

  } catch (error) {
    console.error('Erro ao atualizar status de imóvel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir status de imóvel
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissões usando sistema unificado
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    // Buscar dados ANTES da exclusão para auditoria
    const statusImovel = await findStatusImovelById(id)
    
    if (!statusImovel) {
      return NextResponse.json(
        { error: 'Status de imóvel não encontrado' },
        { status: 404 }
      )
    }

    await deleteStatusImovel(id)

    // Log de auditoria para exclusão (não crítico)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)
      
      await logAuditEvent({
        userId,
        action: 'DELETE',
        resource: 'status-imovel',
        resourceId: statusImovel.id,
        details: {
          description: `Excluiu status de imóvel "${statusImovel.nome}"`,
          nome: statusImovel.nome,
          cor: statusImovel.cor,
          descricao: statusImovel.descricao || '',
          ativo: statusImovel.ativo,
          consulta_imovel_internauta: statusImovel.consulta_imovel_internauta,
          deleted_by: userId
        },
        ipAddress,
        userAgent
      })
    } catch (auditError) {
      console.error('❌ Erro na auditoria (não crítico):', auditError)
    }

    return NextResponse.json({
      success: true,
      message: 'Status de imóvel excluído com sucesso'
    })

  } catch (error) {
    console.error('❌ Erro ao excluir status de imóvel:', error)
    
    // Verificar se é erro de integridade referencial ou não encontrado
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    if (errorMessage.includes('não encontrado') || errorMessage.includes('não foi encontrado')) {
      return NextResponse.json(
        { 
          error: errorMessage,
          success: false
        },
        { status: 404 } // Not Found
      )
    }
    
    // Se for erro de FK constraint do PostgreSQL
    if (errorMessage.includes('violates foreign key constraint') || 
        errorMessage.includes('ainda está sendo referenciado') ||
        errorMessage.includes('is still referenced')) {
      return NextResponse.json(
        { 
          error: 'Não é possível excluir este status pois existem imóveis associados a ele',
          success: false
        },
        { status: 409 } // Conflict - recurso tem dependências
      )
    }
    
    // Outros erros inesperados
    return NextResponse.json(
      { 
        error: 'Erro interno do servidor',
        success: false
      },
      { status: 500 }
    )
  }
}

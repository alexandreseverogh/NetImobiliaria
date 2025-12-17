import { NextResponse, NextRequest } from 'next/server'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import { findCategoriaProximidadeById, updateCategoriaProximidade, deleteCategoriaProximidade } from '@/lib/database/proximidades'
import { logAuditEvent, extractUserIdFromToken } from '@/lib/audit/auditLogger'
import { extractRequestData } from '@/lib/utils/ipUtils'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const categoria = await findCategoriaProximidadeById(id)
    if (!categoria) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: categoria
    })
  } catch (error) {
    console.error('Erro ao buscar categoria de proximidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { nome, descricao, icone, cor, ordem, ativo } = body
    
    if (!nome || !descricao) {
      return NextResponse.json(
        { error: 'Nome e descrição são obrigatórios' },
        { status: 400 }
      )
    }

    // Buscar dados atuais para auditoria
    const categoriaAtual = await findCategoriaProximidadeById(id)
    if (!categoriaAtual) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    const categoriaAtualizada = await updateCategoriaProximidade(id, {
      nome,
      descricao,
      icone: icone || 'map-pin',
      cor: cor || '#10B981',
      ordem: ordem || 1,
      ativo: ativo !== undefined ? ativo : true
    })

    // Log de auditoria (não crítico - falha não afeta operação)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)
      
      await logAuditEvent({
        userId,
        action: 'UPDATE',
        resource: 'categorias-proximidades',
        resourceId: id,
        details: {
          antes: {
            nome: categoriaAtual.nome,
            descricao: categoriaAtual.descricao,
            icone: categoriaAtual.icone,
            cor: categoriaAtual.cor,
            ordem: categoriaAtual.ordem,
            ativo: categoriaAtual.ativo
          },
          depois: {
            nome: categoriaAtualizada.nome,
            descricao: categoriaAtualizada.descricao,
            icone: categoriaAtualizada.icone,
            cor: categoriaAtualizada.cor,
            ordem: categoriaAtualizada.ordem,
            ativo: categoriaAtualizada.ativo
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
      data: categoriaAtualizada
    })
  } catch (error) {
    console.error('Erro ao atualizar categoria de proximidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    // Buscar dados da categoria antes de excluir para auditoria
    const categoria = await findCategoriaProximidadeById(id)
    if (!categoria) {
      return NextResponse.json(
        { error: 'Categoria não encontrada' },
        { status: 404 }
      )
    }

    await deleteCategoriaProximidade(id)

    // Log de auditoria (não crítico - falha não afeta operação)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)
      
      await logAuditEvent({
        userId,
        action: 'DELETE',
        resource: 'categorias-proximidades',
        resourceId: id,
        details: {
          nome: categoria.nome,
          descricao: categoria.descricao,
          icone: categoria.icone,
          cor: categoria.cor,
          ordem: categoria.ordem,
          ativo: categoria.ativo,
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
      message: 'Categoria excluída com sucesso'
    })
  } catch (error) {
    console.error('Erro ao excluir categoria de proximidade:', error)
    
    // Se for um erro de validação (categoria com proximidades associadas), retornar erro 400
    if (error instanceof Error && error.message.includes('Não é possível excluir')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

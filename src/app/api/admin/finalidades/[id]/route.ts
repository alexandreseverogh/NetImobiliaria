import { NextRequest, NextResponse } from 'next/server'
import { findFinalidadeById, updateFinalidade, deleteFinalidade } from '@/lib/database/finalidades'
import { logAuditEvent, extractUserIdFromToken } from '@/lib/audit/auditLogger'
import { extractRequestData } from '@/lib/utils/ipUtils'

// GET - Buscar finalidade por ID
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

    const finalidade = await findFinalidadeById(id)
    if (!finalidade) {
      return NextResponse.json(
        { error: 'Finalidade não encontrada' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: finalidade
    })

  } catch (error) {
    console.error('Erro ao buscar finalidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar finalidade
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
    const { nome, descricao, ativo, tipo_destaque, alugar_landpaging, vender_landpaging, exibe_financiadores } = body
    
    // Validar tipo_destaque (se fornecido)
    if (tipo_destaque !== undefined && tipo_destaque !== null) {
      const valoresPermitidos = ['DV', 'DA', '  ']
      if (!valoresPermitidos.includes(tipo_destaque)) {
        return NextResponse.json(
          { error: 'Tipo de destaque inválido. Valores permitidos: "DV", "DA", "  "' },
          { status: 400 }
        )
      }
    }

    // Buscar dados ANTES da atualização para auditoria
    const finalidadeAntes = await findFinalidadeById(id)
    
    if (!finalidadeAntes) {
      return NextResponse.json(
        { error: 'Finalidade não encontrada' },
        { status: 404 }
      )
    }

    const finalidadeAtualizada = await updateFinalidade(id, {
      nome,
      descricao,
      ativo,
      tipo_destaque,
      alugar_landpaging,
      vender_landpaging,
      exibe_financiadores
    })

    // Log de auditoria com before/after (não crítico)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)
      
      // Montar objeto de mudanças
      const changes: Record<string, { before: any; after: any }> = {}
      
      if (finalidadeAntes.nome !== finalidadeAtualizada.nome) {
        changes.nome = { before: finalidadeAntes.nome, after: finalidadeAtualizada.nome }
      }
      if (finalidadeAntes.descricao !== finalidadeAtualizada.descricao) {
        changes.descricao = { 
          before: finalidadeAntes.descricao || '', 
          after: finalidadeAtualizada.descricao || '' 
        }
      }
      if (finalidadeAntes.ativo !== finalidadeAtualizada.ativo) {
        changes.ativo = { before: finalidadeAntes.ativo, after: finalidadeAtualizada.ativo }
      }
      if (finalidadeAntes.tipo_destaque !== finalidadeAtualizada.tipo_destaque) {
        changes.tipo_destaque = { 
          before: finalidadeAntes.tipo_destaque || '  ', 
          after: finalidadeAtualizada.tipo_destaque || '  ' 
        }
      }
      if (finalidadeAntes.alugar_landpaging !== finalidadeAtualizada.alugar_landpaging) {
        changes.alugar_landpaging = { 
          before: finalidadeAntes.alugar_landpaging || false, 
          after: finalidadeAtualizada.alugar_landpaging || false 
        }
      }
      if (finalidadeAntes.vender_landpaging !== finalidadeAtualizada.vender_landpaging) {
        changes.vender_landpaging = { 
          before: finalidadeAntes.vender_landpaging || false, 
          after: finalidadeAtualizada.vender_landpaging || false 
        }
      }
      if (finalidadeAntes.exibe_financiadores !== finalidadeAtualizada.exibe_financiadores) {
        changes.exibe_financiadores = {
          before: finalidadeAntes.exibe_financiadores || false,
          after: finalidadeAtualizada.exibe_financiadores || false
        }
      }
      
      await logAuditEvent({
        userId,
        action: 'UPDATE',
        resource: 'finalidades',
        resourceId: finalidadeAtualizada.id,
        details: {
          description: `Atualizou finalidade "${finalidadeAtualizada.nome}"`,
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
      data: finalidadeAtualizada
    })

  } catch (error) {
    console.error('Erro ao atualizar finalidade:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir finalidade
export async function DELETE(
  request: Request,
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

    // Buscar dados ANTES da exclusão para auditoria
    const finalidade = await findFinalidadeById(id)
    
    if (!finalidade) {
      return NextResponse.json(
        { error: 'Finalidade não encontrada' },
        { status: 404 }
      )
    }

    await deleteFinalidade(id)

    // Log de auditoria para exclusão (não crítico)
    try {
      const { ipAddress, userAgent } = extractRequestData(request as NextRequest)
      const userId = extractUserIdFromToken(request as NextRequest)
      
      await logAuditEvent({
        userId,
        action: 'DELETE',
        resource: 'finalidades',
        resourceId: finalidade.id,
        details: {
          description: `Excluiu finalidade "${finalidade.nome}"`,
          nome: finalidade.nome,
          descricao: finalidade.descricao || '',
          ativo: finalidade.ativo,
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
      message: 'Finalidade excluída com sucesso'
    })

  } catch (error) {
    console.error('❌ Erro ao excluir finalidade:', error)
    
    // Verificar se é erro de integridade referencial (imóveis associados)
    const errorMessage = error instanceof Error ? error.message : String(error)
    
    if (errorMessage.includes('imóvel(is) cadastrado(s) associado(s)')) {
      return NextResponse.json(
        { 
          error: errorMessage,
          success: false
        },
        { status: 409 } // Conflict - recurso tem dependências
      )
    }
    
    if (errorMessage.includes('não encontrada') || errorMessage.includes('já foi excluída')) {
      return NextResponse.json(
        { 
          error: errorMessage,
          success: false
        },
        { status: 404 } // Not Found
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

/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server'
import { checkApiPermission } from '@/lib/middleware/permissionMiddleware'
import { auditLogger } from '@/lib/utils/auditLogger'
import { 
  findTipoDocumentoById, 
  updateTipoDocumento, 
  deleteTipoDocumento,
  hasDocumentosAssociados,
  UpdateTipoDocumentoData 
} from '@/lib/database/tipo-documentos'

// GET - Buscar tipo de documento por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissões
    const permissionCheck = await checkApiPermission(request)
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

    const tipoDocumento = await findTipoDocumentoById(id)
    if (!tipoDocumento) {
      return NextResponse.json(
        { error: 'Tipo de documento não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      tipoDocumento
    })

  } catch (error) {
    console.error('Erro ao buscar tipo de documento:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar tipo de documento
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissões
    const permissionCheck = await checkApiPermission(request)
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

    const data: UpdateTipoDocumentoData = await request.json()

    // Validação básica
    if (data.descricao !== undefined) {
      if (!data.descricao || data.descricao.trim().length === 0) {
        return NextResponse.json(
          { error: 'Descrição é obrigatória' },
          { status: 400 }
        )
      }

      if (data.descricao.trim().length < 2) {
        return NextResponse.json(
          { error: 'Descrição deve ter pelo menos 2 caracteres' },
          { status: 400 }
        )
      }
    }

    // Atualizar tipo de documento
    const tipoDocumentoAtualizado = await updateTipoDocumento(id, {
      ...data,
      descricao: data.descricao?.trim()
    })

    // Log de auditoria
    auditLogger.log(
      'TIPO_DOCUMENTO_UPDATE',
      `Usuário atualizou tipo de documento ID: ${id}`,
      true,
      'system',
      'system',
      request.ip || 'unknown'
    )

    return NextResponse.json({
      success: true,
      message: 'Tipo de documento atualizado com sucesso',
      tipoDocumento: tipoDocumentoAtualizado
    })

  } catch (error) {
    console.error('Erro ao atualizar tipo de documento:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Já existe um tipo de documento')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        )
      }
      if (error.message.includes('não encontrado')) {
        return NextResponse.json(
          { error: error.message },
          { status: 404 }
        )
      }
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir tipo de documento
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissões
    const permissionCheck = await checkApiPermission(request)
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

    // Verificar se existem documentos associados
    const hasAssociados = await hasDocumentosAssociados(id)
    if (hasAssociados) {
      return NextResponse.json(
        { error: 'Não é possível excluir este tipo de documento pois existem documentos associados' },
        { status: 400 }
      )
    }

    // Excluir tipo de documento
    const excluido = await deleteTipoDocumento(id)
    if (!excluido) {
      return NextResponse.json(
        { error: 'Tipo de documento não encontrado' },
        { status: 404 }
      )
    }

    // Log de auditoria
    auditLogger.log(
      'TIPO_DOCUMENTO_DELETE',
      `Usuário excluiu tipo de documento ID: ${id}`,
      true,
      'system',
      'system',
      request.ip || 'unknown'
    )

    return NextResponse.json({
      success: true,
      message: 'Tipo de documento excluído com sucesso'
    })

  } catch (error) {
    console.error('Erro ao excluir tipo de documento:', error)
    
    if (error instanceof Error && error.message.includes('foreign key')) {
      return NextResponse.json(
        { error: 'Não é possível excluir este tipo de documento pois existem documentos associados' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}







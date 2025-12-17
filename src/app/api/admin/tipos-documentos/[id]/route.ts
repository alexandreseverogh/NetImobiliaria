import { NextRequest, NextResponse } from 'next/server'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import { auditLogger } from '@/lib/utils/auditLogger'
import { logAuditEvent, extractUserIdFromToken } from '@/lib/audit/auditLogger'
import { extractRequestData } from '@/lib/utils/ipUtils'
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

    // Buscar dados atuais para auditoria
    const tipoDocumentoAtual = await findTipoDocumentoById(id)
    if (!tipoDocumentoAtual) {
      return NextResponse.json(
        { error: 'Tipo de documento não encontrado' },
        { status: 404 }
      )
    }

    // Atualizar tipo de documento
    const tipoDocumentoAtualizado = await updateTipoDocumento(id, {
      ...data,
      descricao: data.descricao?.trim()
    })

    // Log de auditoria (não crítico - falha não afeta operação)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)
      
      await logAuditEvent({
        userId,
        action: 'UPDATE',
        resource: 'tipos-documentos',
        resourceId: id,
        details: {
          antes: {
            descricao: tipoDocumentoAtual.descricao,
            consulta_imovel_internauta: tipoDocumentoAtual.consulta_imovel_internauta,
            ativo: tipoDocumentoAtual.ativo
          },
          depois: {
            descricao: tipoDocumentoAtualizado.descricao,
            consulta_imovel_internauta: tipoDocumentoAtualizado.consulta_imovel_internauta,
            ativo: tipoDocumentoAtualizado.ativo
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

    // Verificar se existem documentos associados
    const hasAssociados = await hasDocumentosAssociados(id)
    if (hasAssociados) {
      return NextResponse.json(
        { error: 'Não é possível excluir este tipo de documento pois existem documentos associados' },
        { status: 400 }
      )
    }

    // Buscar dados do tipo de documento antes de excluir para auditoria
    const tipoDocumento = await findTipoDocumentoById(id)
    if (!tipoDocumento) {
      return NextResponse.json(
        { error: 'Tipo de documento não encontrado' },
        { status: 404 }
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

    // Log de auditoria (não crítico - falha não afeta operação)
    try {
      const { ipAddress, userAgent } = extractRequestData(request)
      const userId = extractUserIdFromToken(request)
      
      await logAuditEvent({
        userId,
        action: 'DELETE',
        resource: 'tipos-documentos',
        resourceId: id,
        details: {
          descricao: tipoDocumento.descricao,
          consulta_imovel_internauta: tipoDocumento.consulta_imovel_internauta,
          ativo: tipoDocumento.ativo,
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







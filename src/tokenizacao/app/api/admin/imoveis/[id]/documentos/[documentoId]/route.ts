import { NextRequest, NextResponse } from 'next/server'
import { checkApiPermission } from '@/lib/middleware/permissionMiddleware'
import {
  findDocumentoById,
  deleteDocumentoImovel
} from '@/lib/database/imovel-documentos'
import { logAuditEvent } from '@/lib/database/audit'

// GET - Buscar documento específico
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string, documentoId: string } }
) {
  try {
    // Verificar permissões
    const permissionCheck = await checkApiPermission(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const documentoId = parseInt(params.documentoId)
    if (isNaN(documentoId)) {
      return NextResponse.json(
        { error: 'ID do documento inválido' },
        { status: 400 }
      )
    }

    const documento = await findDocumentoById(documentoId)
    if (!documento) {
      return NextResponse.json(
        { error: 'Documento não encontrado' },
        { status: 404 }
      )
    }

    // Log de auditoria
    await logAuditEvent({
      action: 'IMOVEL_DOCUMENTO_VIEW',
      resourceType: 'documento',
      resourceId: documentoId.toString(),
      details: { documentoId },
      ipAddress: request.ip || 'unknown'
    })

    // Retornar documento como base64 para visualização
    const base64Document = documento.documento.toString('base64')
    const dataUrl = `data:${documento.tipo_arquivo};base64,${base64Document}`

    return NextResponse.json({
      success: true,
      documento: {
        id: documento.id,
        nome_arquivo: documento.nome_arquivo,
        tipo_arquivo: documento.tipo_arquivo,
        tamanho: documento.tamanho,
        tipo_documento_descricao: documento.tipo_documento_descricao,
        data_url: dataUrl,
        created_at: documento.created_at
      }
    })

  } catch (error) {
    console.error('Erro ao buscar documento:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir documento
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string, documentoId: string } }
) {
  try {
    // Verificar permissões
    const permissionCheck = await checkApiPermission(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const documentoId = parseInt(params.documentoId)
    if (isNaN(documentoId)) {
      return NextResponse.json(
        { error: 'ID do documento inválido' },
        { status: 400 }
      )
    }

    const documento = await findDocumentoById(documentoId)
    if (!documento) {
      return NextResponse.json(
        { error: 'Documento não encontrado' },
        { status: 404 }
      )
    }

    const deleted = await deleteDocumentoImovel(documentoId)
    if (!deleted) {
      return NextResponse.json(
        { error: 'Erro ao excluir documento' },
        { status: 500 }
      )
    }

    // Log de auditoria
    await logAuditEvent({
      action: 'IMOVEL_DOCUMENTO_DELETE',
      resourceType: 'documento',
      resourceId: documentoId.toString(),
      details: { 
        documentoId,
        fileName: documento.nome_arquivo,
        imovelId: documento.id_imovel
      },
      ipAddress: request.ip || 'unknown'
    })

    return NextResponse.json({
      success: true,
      message: 'Documento excluído com sucesso'
    })

  } catch (error) {
    console.error('Erro ao excluir documento:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}







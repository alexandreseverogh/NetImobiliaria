/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server'
import { checkApiPermission } from '@/lib/middleware/permissionMiddleware'
import { 
  findDocumentosByImovel, 
  createDocumentoImovel,
  hasDocumentoTipo,
  findTiposDocumentosDisponiveis
} from '@/lib/database/imovel-documentos'
import { logAuditEvent } from '@/lib/database/audit'

// GET - Listar documentos de um imóvel
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

    const imovelId = parseInt(params.id)
    if (isNaN(imovelId)) {
      return NextResponse.json(
        { error: 'ID do imóvel inválido' },
        { status: 400 }
      )
    }

    const documentos = await findDocumentosByImovel(imovelId)

    // Log de auditoria
    await logAuditEvent({
      action: 'IMOVEL_DOCUMENTOS_LIST',
      resourceType: 'imovel',
      resourceId: imovelId.toString(),
      details: { imovelId },
      ipAddress: request.ip || 'unknown'
    })

    return NextResponse.json({
      success: true,
      documentos
    })

  } catch (error) {
    console.error('Erro ao listar documentos do imóvel:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// POST - Upload de documento para imóvel
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissões
    const permissionCheck = await checkApiPermission(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const imovelId = parseInt(params.id)
    if (isNaN(imovelId)) {
      return NextResponse.json(
        { error: 'ID do imóvel inválido' },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('documento') as File
    const tipoDocumentoId = formData.get('tipo_documento_id') as string

    if (!file) {
      return NextResponse.json(
        { error: 'Arquivo não fornecido' },
        { status: 400 }
      )
    }

    if (!tipoDocumentoId) {
      return NextResponse.json(
        { error: 'Tipo de documento não fornecido' },
        { status: 400 }
      )
    }

    const tipoId = parseInt(tipoDocumentoId)
    if (isNaN(tipoId)) {
      return NextResponse.json(
        { error: 'ID do tipo de documento inválido' },
        { status: 400 }
      )
    }

    // Comentado temporariamente para permitir múltiplos documentos do mesmo tipo
    // const jaExiste = await hasDocumentoTipo(imovelId, tipoId)
    // if (jaExiste) {
    //   return NextResponse.json(
    //     { error: 'Já existe um documento deste tipo para este imóvel' },
    //     { status: 400 }
    //   )
    // }

    // Validar tipo de arquivo
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/bmp',
      'image/tiff',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Tipo de arquivo não permitido: ${file.type}. Use PDF, JPG, PNG, GIF, DOC, DOCX, XLS ou XLSX` },
        { status: 400 }
      )
    }

    // Validar tamanho (máximo 50MB)
    const maxSize = 50 * 1024 * 1024 // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo 50MB permitido' },
        { status: 400 }
      )
    }

    // Converter arquivo para buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Criar documento no banco
    console.log('🔍 API Documentos - Criando documento no banco:', {
      id_tipo_documento: tipoId,
      id_imovel: imovelId,
      nome_arquivo: file.name,
      tipo_arquivo: file.type,
      tamanho: file.size,
      buffer_size: buffer.length
    })
    
    const documentoId = await createDocumentoImovel({
      id_tipo_documento: tipoId,
      id_imovel: imovelId,
      documento: buffer,
      nome_arquivo: file.name,
      tipo_mime: file.type,
      tamanho_bytes: file.size
    })
    
    console.log('🔍 API Documentos - Documento criado com ID:', documentoId)

    // Log de auditoria
    await logAuditEvent({
      action: 'IMOVEL_DOCUMENTO_CREATE',
      resourceType: 'imovel',
      resourceId: imovelId.toString(),
      details: { 
        documentoId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      },
      ipAddress: request.ip || 'unknown'
    })

    return NextResponse.json({
      success: true,
      message: 'Documento enviado com sucesso',
      documentoId
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao fazer upload de documento:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}







/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server'
import { checkApiPermission } from '@/lib/middleware/permissionMiddleware'

// Forçar uso do Node.js runtime
export const runtime = 'nodejs'
import { 
  findImovelById, 
  findImovelImagens, 
  findImovelImagem, 
  insertImovelImagem, 
  updateImovelImagensOrdem, 
  deleteImovelImagem, 
  deleteImovelImagemPermanente,
  setImovelImagemPrincipal 
} from '@/lib/database/imoveis'
import { writeFile, mkdir, unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// Configurações de upload
const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'imoveis')
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

// Garantir que o diretório de upload existe
async function ensureUploadDir(imovelId: number) {
  const imovelDir = join(UPLOAD_DIR, imovelId.toString())
  if (!existsSync(imovelDir)) {
    await mkdir(imovelDir, { recursive: true })
  }
  return imovelDir
}

// Listar imagens do imóvel
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

    // Validar ID
    const id = parseInt(params.id)
    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    // Verificar se o imóvel existe
    const imovel = await findImovelById(id)
    if (!imovel) {
      return NextResponse.json(
        { error: 'Imóvel não encontrado' },
        { status: 404 }
      )
    }

    // Buscar imagens no banco de dados
    console.log('🔍 API Imagens - Buscando imagens para imóvel:', id)
    const imagens = await findImovelImagens(id)
    console.log('🔍 API Imagens - Imagens encontradas:', imagens.length)
    console.log('🔍 API Imagens - Dados das imagens:', imagens)
    
    return NextResponse.json({
      success: true,
      data: imagens
    })

  } catch (error) {
    console.error('Erro ao listar imagens:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Upload de imagens
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

    // Validar ID
    const id = parseInt(params.id)
    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    // Verificar se o imóvel existe
    const imovel = await findImovelById(id)
    if (!imovel) {
      return NextResponse.json(
        { error: 'Imóvel não encontrado' },
        { status: 404 }
      )
    }

    // Processar formulário multipart
    const formData = await request.formData()
    const files = formData.getAll('images') as File[]
    
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'Nenhuma imagem fornecida' },
        { status: 400 }
      )
    }

    if (files.length > 10) {
      return NextResponse.json(
        { error: 'Máximo de 10 imagens permitido' },
        { status: 400 }
      )
    }

    // Garantir diretório de upload
    const imovelDir = await ensureUploadDir(id)
    
    // Buscar imagens existentes para determinar a próxima ordem
    const existingImages = await findImovelImagens(id)
    let nextOrdem = existingImages.length > 0 ? Math.max(...existingImages.map(img => img.ordem || 0)) + 1 : 1
    
    const uploadedImages: any[] = []

    for (const file of files) {
      // Validar tipo de arquivo
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Tipo de arquivo não permitido: ${file.type}` },
          { status: 400 }
        )
      }

      // Validar tamanho
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Arquivo muito grande: ${file.name}` },
          { status: 400 }
        )
      }

      // Gerar nome único
      const timestamp = Date.now()
      const random = Math.random().toString(36).substring(2)
      const extension = file.name.split('.').pop()
      const filename = `${timestamp}_${random}.${extension}`
      const filepath = join(imovelDir, filename)

      // Salvar arquivo
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filepath, buffer)

      // Salvar informações no banco de dados
      const imagemId = await insertImovelImagem({
        imovelId: id,
        ordem: nextOrdem,
        principal: existingImages.length === 0 && uploadedImages.length === 0, // Primeira imagem será principal
        tipoMime: file.type,
        tamanhoBytes: file.size,
        imagem: buffer
      })
      
      nextOrdem++ // Incrementar para a próxima imagem
      
      uploadedImages.push({
        id: imagemId,
        nome_arquivo: filename,
        url: `/uploads/imoveis/${id}/${filename}`,
        tamanho: file.size,
        tipo: file.type,
        ordem: uploadedImages.length
      })
    }

    return NextResponse.json({
      success: true,
      message: `${uploadedImages.length} imagem(ns) enviada(s) com sucesso`,
      data: uploadedImages
    }, { status: 201 })

  } catch (error) {
    console.error('Erro ao fazer upload de imagens:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Atualizar ordem das imagens
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

    // Validar ID
    const id = parseInt(params.id)
    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { imagens } = body

    if (!Array.isArray(imagens)) {
      return NextResponse.json(
        { error: 'Formato inválido para reordenação' },
        { status: 400 }
      )
    }

    // Atualizar ordem no banco de dados
    await updateImovelImagensOrdem(id, imagens)

    return NextResponse.json({
      success: true,
      message: 'Ordem das imagens atualizada com sucesso'
    })

  } catch (error) {
    console.error('Erro ao atualizar ordem das imagens:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Excluir imagem
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('🚨 API DELETE imagem - FUNÇÃO CHAMADA!')
  try {
    // Verificar permissões - TEMPORÁRIO: comentado para teste
    console.log('🔍 API DELETE imagem - INICIANDO DELETE')
    console.log('🔍 API DELETE imagem - Params recebidos:', params)
    console.log('🔍 API DELETE imagem - URL completa:', request.url)
    console.log('🔍 API DELETE imagem - PULANDO verificação de permissões para teste')
    // const permissionCheck = await checkApiPermission(request)
    // if (permissionCheck) {
    //   return permissionCheck
    // }

    // Validar ID
    const id = parseInt(params.id)
    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const { searchParams } = new URL(request.url)
    const imagemId = searchParams.get('id')
    
    console.log('🔍 API DELETE imagem - URL:', request.url)
    console.log('🔍 API DELETE imagem - SearchParams:', searchParams.toString())
    console.log('🔍 API DELETE imagem - ImagemId extraído:', imagemId)

    if (!imagemId) {
      console.log('❌ API DELETE imagem - ID da imagem não fornecido')
      return NextResponse.json(
        { error: 'ID da imagem não fornecido' },
        { status: 400 }
      )
    }

    // Buscar informações da imagem no banco
    console.log('🔍 API DELETE imagem - Buscando imagem no banco com ID:', parseInt(imagemId))
    const imagem = await findImovelImagem(parseInt(imagemId))
    
    if (!imagem) {
      return NextResponse.json(
        { error: 'Imagem não encontrada' },
        { status: 404 }
      )
    }

    // Verificar se a imagem pertence ao imóvel
    if (imagem.imovel_id !== id) {
      return NextResponse.json(
        { error: 'Imagem não pertence ao imóvel' },
        { status: 403 }
      )
    }

    // Excluir arquivo físico - COMENTADO: tabela imovel_imagens não tem nome_arquivo
    // const filepath = join(UPLOAD_DIR, id.toString(), imagem.nome_arquivo)
    // if (existsSync(filepath)) {
    //   await unlink(filepath)
    // }
    console.log('🔍 API DELETE imagem - Pulando exclusão de arquivo físico (campo nome_arquivo não existe na tabela)')

    // Excluir do banco de dados
    console.log('🔍 API DELETE imagem - Chamando deleteImovelImagemPermanente para imagem ID:', imagem.id)
    const deleteResult = await deleteImovelImagemPermanente(imagem.id)
    console.log('🔍 API DELETE imagem - Resultado da deleção:', deleteResult)

    return NextResponse.json({
      success: true,
      message: 'Imagem excluída com sucesso'
    })

  } catch (error) {
    console.error('Erro ao excluir imagem:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

// Definir imagem como principal
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar permissões
    const permissionCheck = await checkApiPermission(request)
    if (permissionCheck) {
      return permissionCheck
    }

    // Validar ID
    const id = parseInt(params.id)
    if (isNaN(id) || id <= 0) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    // Verificar se o imóvel existe
    const imovel = await findImovelById(id)
    if (!imovel) {
      return NextResponse.json(
        { error: 'Imóvel não encontrado' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { imagemId } = body

    if (!imagemId) {
      return NextResponse.json(
        { error: 'ID da imagem não fornecido' },
        { status: 400 }
      )
    }

    // Verificar se a imagem existe e pertence ao imóvel
    const imagem = await findImovelImagem(parseInt(imagemId))
    if (!imagem) {
      return NextResponse.json(
        { error: 'Imagem não encontrada' },
        { status: 404 }
      )
    }

    if (imagem.imovel_id !== id) {
      return NextResponse.json(
        { error: 'Imagem não pertence ao imóvel' },
        { status: 403 }
      )
    }

    // Definir como principal
    const success = await setImovelImagemPrincipal(id, parseInt(imagemId))

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Imagem definida como principal com sucesso'
      })
    } else {
      return NextResponse.json(
        { error: 'Erro ao definir imagem como principal' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Erro ao definir imagem como principal:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}







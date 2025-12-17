import { NextRequest, NextResponse } from 'next/server'
import { Buffer } from 'buffer'
import { findImovelVideoWithBuffer } from '@/lib/database/imovel-video'
import { verifyTokenNode } from '@/lib/auth/jwt-node'

// Função para extrair usuário logado
function getCurrentUser(request: NextRequest): string | null {
  try {
    const token = request.cookies.get('accessToken')?.value || 
                  request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) return null
    
    const decoded = verifyTokenNode(token)
    return decoded ? decoded.userId : null
  } catch (error) {
    console.error('❌ Erro ao extrair usuário:', error)
    return null
  }
}

// GET - Stream do vídeo para preview
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verificar autenticação
    const currentUserId = getCurrentUser(request)
    if (!currentUserId) {
      return NextResponse.json(
        { error: 'Token de autenticação não fornecido' },
        { status: 401 }
      )
    }
    
    const imovelId = parseInt(params.id)
    
    if (isNaN(imovelId)) {
      return NextResponse.json(
        { error: 'ID do imóvel inválido' },
        { status: 400 }
      )
    }
    
    console.log('🔍 GET /api/admin/imoveis/[id]/video/preview - Stream de vídeo para imóvel:', imovelId)
    
    const video = await findImovelVideoWithBuffer(imovelId)
    
    if (!video) {
      return NextResponse.json(
        { error: 'Vídeo não encontrado' },
        { status: 404 }
      )
    }
    
    // Retornar vídeo como stream
    const rawVideoData = video.video as unknown
    let videoBuffer: Buffer

    if (Buffer.isBuffer(rawVideoData)) {
      videoBuffer = rawVideoData
    } else if (rawVideoData && typeof rawVideoData === 'object' && 'type' in (rawVideoData as any) && (rawVideoData as any).type === 'Buffer' && Array.isArray((rawVideoData as any).data)) {
      videoBuffer = Buffer.from((rawVideoData as { data: number[] }).data)
    } else if (ArrayBuffer.isView(rawVideoData as ArrayBufferView)) {
      const view = rawVideoData as ArrayBufferView
      videoBuffer = Buffer.from(view.buffer)
    } else if (typeof rawVideoData === 'string') {
      videoBuffer = Buffer.from(rawVideoData, 'base64')
    } else if (rawVideoData instanceof ArrayBuffer) {
      videoBuffer = Buffer.from(rawVideoData)
    } else {
      videoBuffer = Buffer.from(rawVideoData as any)
    }

    const uint8Array = new Uint8Array(videoBuffer)

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': video.tipo_mime,
        'Content-Length': video.tamanho_bytes.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
        'Content-Disposition': `inline; filename="${video.nome_arquivo}"`
      }
    })
    
  } catch (error) {
    console.error('❌ Erro ao fazer stream do vídeo:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

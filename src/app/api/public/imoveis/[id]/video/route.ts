import { NextRequest, NextResponse } from 'next/server'
import { findImovelVideoWithBuffer } from '@/lib/database/imovel-video'

// API PÚBLICA - Buscar vídeo de imóvel (SEM autenticação)
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const imovelId = parseInt(params.id)
    
    if (isNaN(imovelId) || imovelId <= 0) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    console.log('🔍 API Pública - Buscando vídeo para imóvel:', imovelId)
    
    // Buscar vídeo COM buffer
    const video = await findImovelVideoWithBuffer(imovelId)
    
    if (!video) {
      return NextResponse.json(
        { error: 'Vídeo não encontrado' },
        { status: 404 }
      )
    }

    console.log('✅ API Pública - Vídeo encontrado:', {
      id: video.id,
      tamanho: video.tamanho_bytes,
      formato: video.formato
    })

    return NextResponse.json({
      success: true,
      data: video
    })

  } catch (error) {
    console.error('❌ Erro ao buscar vídeo público:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}




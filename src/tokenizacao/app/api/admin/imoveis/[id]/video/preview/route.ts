/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server'
import { findImovelVideo } from '@/lib/database/imovel-video'
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
    
    const video = await findImovelVideo(imovelId)
    
    if (!video) {
      return NextResponse.json(
        { error: 'Vídeo não encontrado' },
        { status: 404 }
      )
    }
    
    // Retornar vídeo como stream
    return new NextResponse(video.video, {
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

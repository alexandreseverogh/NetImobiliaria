import { NextRequest, NextResponse } from 'next/server'
import { findImovelImagens } from '@/lib/database/imoveis'

// GET - Testar busca de imagens
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const imovelId = parseInt(params.id)
    
    if (isNaN(imovelId)) {
      return NextResponse.json(
        { error: 'ID do imóvel inválido' },
        { status: 400 }
      )
    }

    console.log('🔍 TESTE - Buscando imagens para imóvel:', imovelId)
    
    const imagens = await findImovelImagens(imovelId)
    
    console.log('🔍 TESTE - Resultado da busca:', {
      count: imagens.length,
      imagens: imagens.map(img => ({
        id: img.id,
        ordem: img.ordem,
        is_principal: img.is_principal,
        tipo_mime: img.tipo_mime,
        tamanho_bytes: img.tamanho_bytes,
        has_url: !!img.url
      }))
    })

    return NextResponse.json({
      success: true,
      imovelId,
      count: imagens.length,
      imagens: imagens.map(img => ({
        id: img.id,
        ordem: img.ordem,
        is_principal: img.is_principal,
        tipo_mime: img.tipo_mime,
        tamanho_bytes: img.tamanho_bytes,
        url_preview: img.url ? img.url.substring(0, 50) + '...' : null
      }))
    })

  } catch (error) {
    console.error('❌ TESTE - Erro ao buscar imagens:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    )
  }
}

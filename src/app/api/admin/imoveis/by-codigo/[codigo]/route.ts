import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import { findImovelByCodigo } from '@/lib/database/imoveis'
import { findAmenidadesByImovel } from '@/lib/database/amenidades'
import { findProximidadesByImovel } from '@/lib/database/proximidades'
import { findDocumentosByImovel } from '@/lib/database/imovel-documentos'
import { findImovelImagens } from '@/lib/database/imoveis'

// GET - Buscar imóvel por código
export async function GET(
  request: NextRequest,
  { params }: { params: { codigo: string } }
) {
  // Verificar permissão
  const permissionCheck = await unifiedPermissionMiddleware(request)
  if (permissionCheck) {
    return permissionCheck
  }

  try {
    const codigo = params.codigo
    
    // Extrair tenantId do JWT para isolamento
    const { getTokenFromRequest, verifyToken } = await import('@/lib/auth/jwt')
    const token = getTokenFromRequest(request)
    const decoded = token ? await verifyToken(token) : null
    const tenantId = decoded?.is_system_role ? null : decoded?.tenantId

    // DEBUG: Escrever em arquivo para ver o que está acontecendo
    try {
      const fs = require('fs')
      const debugMsg = `[${new Date().toISOString()}] by-codigo: codigo=${codigo}, tenantId=${tenantId}, decoded=${JSON.stringify(decoded)}\n`
      fs.appendFileSync('c:/NetImobiliária/net-imobiliaria/scratch/debug_api.txt', debugMsg)
    } catch (e) {}

    console.log('🔍 API: Buscando imóvel por código:', codigo, 'Tenant:', tenantId)
    
    // Buscar dados básicos do imóvel por código com isolamento
    const imovel = await findImovelByCodigo(codigo, tenantId)
    
    if (!imovel) {
      console.log('❌ API: Imóvel não encontrado com código:', codigo, 'no tenant:', tenantId)
      return NextResponse.json(
        { 
          success: false,
          error: 'Imóvel não encontrado' 
        },
        { status: 404 }
      )
    }
    
    console.log('✅ API: Imóvel encontrado:', {
      id: imovel.id,
      codigo: imovel.codigo,
      titulo: imovel.titulo,
      finalidade_fk: (imovel as any).finalidade_fk,
      finalidade_tipo_destaque: (imovel as any).finalidade_tipo_destaque,
      finalidade_tipo_destaque_length: (imovel as any).finalidade_tipo_destaque?.length
    })
    
    // Buscar dados relacionados
    const [amenidades, proximidades, documentos, imagens] = await Promise.all([
      findAmenidadesByImovel(imovel.id!),
      findProximidadesByImovel(imovel.id!),
      findDocumentosByImovel(imovel.id!),
      findImovelImagens(imovel.id!)
    ])
    
    // Encontrar imagem principal
    const imagemPrincipal = imagens.find(img => img.is_principal) || imagens[0]
    
    // Montar resposta completa
    const response = {
      success: true,
      imovel: {
        ...imovel,
        amenidades,
        proximidades,
        documentos,
        imagens,
        imagem_principal: imagemPrincipal ? {
          id: imagemPrincipal.id,
          url: imagemPrincipal.url,
          descricao: imagemPrincipal.descricao
        } : null
      }
    }
    
    return NextResponse.json(response)
    
  } catch (error) {
    console.error('❌ API: Erro ao buscar imóvel por código:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Erro interno do servidor' 
      },
      { status: 500 }
    )
  }
}




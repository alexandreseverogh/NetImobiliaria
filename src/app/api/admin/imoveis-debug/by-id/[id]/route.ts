import { NextRequest, NextResponse } from 'next/server'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import { findImovelById } from '@/lib/database/imoveis'
import { findAmenidadesByImovel } from '@/lib/database/amenidades'
import { findProximidadesByImovel } from '@/lib/database/proximidades'
import { findDocumentosByImovel } from '@/lib/database/imovel-documentos'
import { findImovelImagens } from '@/lib/database/imoveis'

// GET - Buscar imóvel por ID
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    // Verificar permissão
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
        return permissionCheck
    }

    try {
        const id = parseInt(params.id)
        if (isNaN(id)) {
            return NextResponse.json({ success: false, error: 'ID inválido' }, { status: 400 })
        }

        console.log('🔍 API: Buscando imóvel por ID:', id)

        // Buscar dados básicos do imóvel
        const imovel = await findImovelById(id)

        if (!imovel) {
            console.log('❌ API: Imóvel não encontrado com ID:', id)
            return NextResponse.json(
                {
                    success: false,
                    error: 'Imóvel não encontrado'
                },
                { status: 404 }
            )
        }

        // Buscar dados relacionados
        const [amenidades, proximidades, documentos, imagens] = await Promise.all([
            findAmenidadesByImovel(imovel.id!),
            findProximidadesByImovel(imovel.id!),
            findDocumentosByImovel(imovel.id!),
            findImovelImagens(imovel.id!)
        ])

        // Encontrar imagem principal
        const imagemPrincipal = imagens.find(img => img.is_principal) || imagens[0]

        // Montar resposta completa (formato compatível com by-codigo)
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
        console.error('❌ API: Erro ao buscar imóvel por ID:', error)
        return NextResponse.json(
            {
                success: false,
                error: 'Erro interno do servidor'
            },
            { status: 500 }
        )
    }
}

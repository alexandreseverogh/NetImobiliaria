import { NextResponse } from 'next/server'
import pool from '@/lib/database/connection'

export const dynamic = 'force-dynamic'

export async function GET(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id)

        if (isNaN(id)) {
            return new NextResponse('ID inválido', { status: 400 })
        }

        // Busca apenas o binário da imagem e o tipo mime
        // Evita carregar outros metadados desnecessários
        const query = 'SELECT imagem, tipo_mime FROM imovel_imagens WHERE id = $1'
        const result = await pool.query(query, [id])

        if (result.rowCount === 0) {
            return new NextResponse('Imagem não encontrada', { status: 404 })
        }

        const image = result.rows[0].imagem
        const contentType = result.rows[0].tipo_mime || 'image/jpeg'

        // Retorna o buffer da imagem diretamente com cache headers otimizados
        return new NextResponse(image, {
            headers: {
                'Content-Type': contentType,
                // Cache agressivo: 1 ano (imagens são imutáveis por ID)
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        })
    } catch (error) {
        console.error('Erro ao buscar imagem streaming:', error)
        return new NextResponse('Erro interno do servidor', { status: 500 })
    }
}

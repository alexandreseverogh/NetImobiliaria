import { NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { getS3Url } from '@/lib/storage/s3-client'

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

        // Primeiro, verificar se a imagem está no S3 (consulta leve, sem carregar o BYTEA)
        const metaQuery = 'SELECT storage_type, s3_key, url_cdn, tipo_mime FROM imovel_imagens WHERE id = $1'
        const metaResult = await pool.query(metaQuery, [id])

        if (metaResult.rowCount === 0) {
            return new NextResponse('Imagem não encontrada', { status: 404 })
        }

        const meta = metaResult.rows[0]

        // ============================================================
        // CAMINHO RÁPIDO: Se a imagem está no S3, redirecionar (zero CPU)
        // ============================================================
        if (meta.storage_type === 's3' && (meta.url_cdn || meta.s3_key)) {
            const redirectUrl = meta.url_cdn || getS3Url(meta.s3_key)
            
            if (redirectUrl) {
                return NextResponse.redirect(redirectUrl, {
                    status: 302,
                    headers: {
                        'Cache-Control': 'public, max-age=31536000, immutable',
                    }
                })
            }
        }

        // ============================================================
        // FALLBACK: Imagem ainda no banco (BYTEA) — modelo legado
        // ============================================================
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

import { NextResponse } from 'next/server'
import { pool } from '@/lib/database/connection'

export const dynamic = 'force-dynamic'

// Tipagem do retorno
interface LocalAtivo {
    estado: string
    cidade: string
}

export async function GET() {
    try {
        const client = await pool.connect()
        try {
            // Consulta ultra-rápida na view materializada
            const result = await client.query(`
        SELECT estado, cidade 
        FROM mv_cidades_ativas 
        ORDER BY estado ASC, cidade ASC
      `)

            const locais: LocalAtivo[] = result.rows

            return NextResponse.json({
                success: true,
                data: locais
            }, {
                // Cache-Control para otimizar ainda mais (cache curto de 1 min é seguro)
                headers: {
                    'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120'
                }
            })
        } finally {
            client.release()
        }
    } catch (error: any) {
        console.error('❌ [API Locais Ativos] Erro:', error)
        return NextResponse.json(
            { success: false, error: 'Erro ao carregar locais' },
            { status: 500 }
        )
    }
}

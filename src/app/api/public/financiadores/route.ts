import { NextResponse } from 'next/server'
import pool from '@/lib/database/connection'

export const dynamic = 'force-dynamic'

type Row = {
  id: number
  nome: string
  headline: string
  logo_base64: string
  logo_tipo_mime: string
}

export async function GET() {
  try {
    const result = await pool.query<Row>(`
      SELECT id, nome, headline, logo_base64, logo_tipo_mime
      FROM public.financiadores
      WHERE ativo = true
      ORDER BY valor_mensal DESC, id DESC
      LIMIT 8
    `)

    const data = (result.rows || []).map((r: any) => ({
      id: Number(r.id),
      nome: r.nome,
      headline: r.headline,
      logo_base64: r.logo_base64, // Já está em base64 na tabela
      logo_tipo_mime: r.logo_tipo_mime
    }))

    // Só faz sentido retornar items com logo
    const filtered = data.filter((d) => d.logo_base64 && d.logo_tipo_mime)

    return NextResponse.json(
      { success: true, data: filtered },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error: any) {
    console.error('Erro ao listar financiadores públicos:', error)
    return NextResponse.json(
      { success: false, error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}



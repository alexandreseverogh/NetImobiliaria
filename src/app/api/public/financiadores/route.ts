import { NextResponse } from 'next/server'
import pool from '@/lib/database/connection'

export const dynamic = 'force-dynamic'

type Row = {
  id: number
  nome: string
  headline: string
  logo: any
  logo_tipo_mime: string
}

function bufferToBase64(value: any): string | null {
  if (!value) return null
  try {
    if (Buffer.isBuffer(value)) return value.toString('base64')
    if (value instanceof Uint8Array) return Buffer.from(value).toString('base64')
    if (typeof value === 'string') {
      const s = value.trim()
      if (s.startsWith('\\x')) return Buffer.from(s.slice(2), 'hex').toString('base64')
      return Buffer.from(s, 'latin1').toString('base64')
    }
    return null
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const result = await pool.query<Row>(`
      SELECT id, nome, headline, logo, logo_tipo_mime
      FROM public.financiamento_patrocinadores
      WHERE ativo = true
      ORDER BY valor_mensal DESC, id DESC
      LIMIT 8
    `)

    const data = (result.rows || []).map((r) => ({
      id: Number(r.id),
      nome: r.nome,
      headline: r.headline,
      logo_base64: bufferToBase64(r.logo),
      logo_tipo_mime: r.logo_tipo_mime
    }))

    // Só faz sentido retornar items com logo decodificável
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



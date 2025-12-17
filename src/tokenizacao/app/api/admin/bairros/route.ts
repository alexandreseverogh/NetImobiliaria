import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'

export async function GET(request: NextRequest) {
  try {
    // Buscar bairros únicos da tabela imoveis
    const result = await pool.query(`
      SELECT DISTINCT bairro 
      FROM imoveis 
      WHERE bairro IS NOT NULL 
      AND bairro != '' 
      ORDER BY bairro ASC
    `)

    const bairros = result.rows.map(row => row.bairro)

    return NextResponse.json(bairros)
  } catch (error) {
    console.error('Erro ao buscar bairros:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

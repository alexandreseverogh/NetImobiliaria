/* eslint-disable */
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'

export async function GET(request: NextRequest) {
  try {
    // Buscar cÃ³digos Ãºnicos da tabela imoveis
    const result = await pool.query(`
      SELECT DISTINCT codigo 
      FROM imoveis 
      WHERE codigo IS NOT NULL 
      AND codigo != '' 
      ORDER BY codigo ASC
    `)

    const codigos = result.rows.map(row => row.codigo)

    return NextResponse.json(codigos)
  } catch (error) {
    console.error('Erro ao buscar cÃ³digos:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}


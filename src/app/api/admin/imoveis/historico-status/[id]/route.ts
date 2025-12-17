import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const imovelId = parseInt(params.id)
    
    if (isNaN(imovelId)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    // Buscar histórico de status do imóvel
    const query = `
      SELECT 
        ist.id,
        ist.imovel_fk,
        ist.status_fk,
        ist.observacao,
        ist.created_by,
        ist.created_at,
        si.nome as status_nome,
        si.cor as status_cor,
        u.username as usuario_nome
      FROM imovel_status ist
      INNER JOIN status_imovel si ON ist.status_fk = si.id
      LEFT JOIN users u ON ist.created_by = u.id
      WHERE ist.imovel_fk = $1
      ORDER BY ist.created_at DESC
    `
    
    console.log('🔍 Buscando histórico para imóvel:', imovelId)
    const result = await pool.query(query, [imovelId])
    console.log('📊 Resultados encontrados:', result.rows.length)
    console.log('📋 Dados retornados:', result.rows)

    return NextResponse.json({
      success: true,
      historico: result.rows
    })

  } catch (error) {
    console.error('Erro ao buscar histórico de status:', error)
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    )
  }
}

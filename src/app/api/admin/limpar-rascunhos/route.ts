import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'

export async function DELETE(request: NextRequest) {
  try {
    console.log('🧹 API - Limpando tabela imovel_rascunho...')
    
    // Limpar todos os registros da tabela imovel_rascunho
    const result = await pool.query('DELETE FROM imovel_rascunho')
    
    console.log('✅ API - Tabela imovel_rascunho limpa:', result.rowCount, 'registros removidos')
    
    return NextResponse.json({
      success: true,
      message: 'Tabela imovel_rascunho limpa com sucesso',
      registrosRemovidos: result.rowCount
    })
    
  } catch (error) {
    console.error('❌ API - Erro ao limpar tabela imovel_rascunho:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Erro interno do servidor',
        details: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}







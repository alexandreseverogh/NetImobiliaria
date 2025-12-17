import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Teste API - Iniciando...')
    
    const query = `
      SELECT 
        i.id,
        i.codigo,
        i.titulo,
        i.preco,
        ti.nome as tipo_nome,
        fi.nome as finalidade_nome
      FROM imoveis i
      LEFT JOIN tipos_imovel ti ON i.tipo_fk = ti.id
      LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
      WHERE i.id = 51 AND i.ativo = true
    `

    console.log('🔍 Executando query de teste...')
    const result = await pool.query(query)
    console.log('🔍 Resultado:', result.rows.length, 'registros')

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Imóvel não encontrado' }, { status: 404 })
    }

    const imovel = result.rows[0]
    console.log('✅ Imóvel encontrado:', imovel.codigo)

    return NextResponse.json({
      success: true,
      imovel: {
        id: imovel.id,
        codigo: imovel.codigo,
        titulo: imovel.titulo,
        preco: imovel.preco,
        tipo_nome: imovel.tipo_nome,
        finalidade_nome: imovel.finalidade_nome
      }
    })

  } catch (error) {
    console.error('❌ Erro no teste:', error)
    return NextResponse.json(
      { error: 'Erro: ' + (error as Error).message },
      { status: 500 }
    )
  }
}

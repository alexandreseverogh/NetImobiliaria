import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'

/**
 * CRM KANBAN COLUMNS CRUD API
 * Permite flexibilidade total na gestão do funil de vendas.
 */

// LISTAR COLUNAS (ORDENADAS)
export async function GET() {
  try {
    const { rows } = await pool.query(`
      SELECT * FROM kanban_colunas 
      WHERE ativa = true 
      ORDER BY ordem ASC
    `)
    return NextResponse.json({ success: true, colunas: rows })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// CRIAR/ATUALIZAR COLUNA
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, nome, titulo_exibicao, ordem, cor, icone, descricao, sla_hours } = body

    if (id) {
      // UPDATE
      const query = `
        UPDATE kanban_colunas 
        SET 
          nome = $1, 
          titulo_exibicao = $2, 
          ordem = $3, 
          cor = $4, 
          icone = $5, 
          descricao = $6,
          sla_hours = $7,
          updated_at = NOW()
        WHERE id = $8
        RETURNING *
      `
      const { rows } = await pool.query(query, [nome, titulo_exibicao, ordem, cor, icone, descricao, sla_hours || 24, id])
      return NextResponse.json({ success: true, coluna: rows[0] })
    } else {
      // INSERT
      const query = `
        INSERT INTO kanban_colunas (nome, titulo_exibicao, ordem, cor, icone, descricao, sla_hours)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `
      const { rows } = await pool.query(query, [nome, titulo_exibicao, ordem, cor, icone, descricao, sla_hours || 24])
      return NextResponse.json({ success: true, coluna: rows[0] })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// REMOVER/DESATIVAR COLUNA
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return NextResponse.json({ error: 'ID necessário' }, { status: 400 })

    // Verificação de segurança: Não excluir se houver leads na coluna
    const checkLeads = await pool.query('SELECT count(*) FROM leads_kanban WHERE coluna_id = $1', [id])
    if (parseInt(checkLeads.rows[0].count) > 0) {
      return NextResponse.json({ error: 'Existem leads nesta coluna. Realoque-os antes de excluir.' }, { status: 400 })
    }

    await pool.query('DELETE FROM kanban_colunas WHERE id = $1', [id])
    return NextResponse.json({ success: true, message: 'Coluna removida com sucesso.' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

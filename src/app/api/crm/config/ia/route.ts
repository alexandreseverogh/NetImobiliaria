import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyToken, getTokenFromRequest } from '@/lib/auth/jwt'

async function getContext(request: NextRequest) {
  const token = getTokenFromRequest(request)
  if (!token) return null
  const decoded = await verifyToken(token)
  return decoded
}

export async function GET(request: NextRequest) {
  try {
    const context = await getContext(request)
    if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    
    const tenantId = (context as any).tenantId || '00000000-0000-0000-0000-000000000001'

    const segmentsRes = await pool.query('SELECT * FROM config_segmentos WHERE tenant_id = $1 ORDER BY nome ASC', [tenantId])
    const rulesRes = await pool.query(`
      SELECT r.*, s.nome as segmento_nome 
      FROM config_segmentos_inteligencia r
      JOIN config_segmentos s ON r.segmento_id = s.id
      WHERE r.tenant_id = $1
      ORDER BY s.nome ASC, r.tag_resultante ASC
    `, [tenantId])
    
    return NextResponse.json({
      success: true,
      segments: segmentsRes.rows,
      rules: rulesRes.rows
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getContext(request)
    if (!context) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    
    const tenantId = (context as any).tenantId || '00000000-0000-0000-0000-000000000001'
    const { action, data } = await request.json()
    
    if (action === 'saveRule') {
      if (data.id) {
        await pool.query(
          `UPDATE config_segmentos_inteligencia 
           SET segmento_id = $1, palavras_chave = $2, tag_resultante = $3, resumo_modelo = $4, score_base = $5, ativa = $6
           WHERE id = $7 AND tenant_id = $8`,
          [data.segmento_id, data.palavras_chave, data.tag_resultante, data.resumo_modelo, data.score_base, data.ativa, data.id, tenantId]
        )
      } else {
        await pool.query(
          `INSERT INTO config_segmentos_inteligencia (segmento_id, palavras_chave, tag_resultante, resumo_modelo, score_base, tenant_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [data.segmento_id, data.palavras_chave, data.tag_resultante, data.resumo_modelo, data.score_base, tenantId]
        )
      }
    } else if (action === 'deleteRule') {
      await pool.query('DELETE FROM config_segmentos_inteligencia WHERE id = $1 AND tenant_id = $2', [data.id, tenantId])
    } else if (action === 'saveSegment') {
      if (data.id) {
        await pool.query('UPDATE config_segmentos SET nome = $1, icone = $2, prompt_ia = $3 WHERE id = $4 AND tenant_id = $5', [data.nome, data.icone, data.prompt_ia, data.id, tenantId])
      } else {
        await pool.query('INSERT INTO config_segmentos (nome, icone, prompt_ia, tenant_id) VALUES ($1, $2, $3, $4)', [data.nome, data.icone, data.prompt_ia, tenantId])
      }
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

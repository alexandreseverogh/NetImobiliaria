import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { unifiedPermissionMiddleware } from '@/lib/middleware/UnifiedPermissionMiddleware'
import { EnrichmentService } from '@/lib/crm/enrichmentService'

/**
 * CRM SEGMENT CONFIGURATION API (METADATA-DRIVEN)
 * Gerencia como os leads são enriquecidos para cada domínio (Imóveis, Saúde, etc).
 */

// GET - Buscar configuração de segmentos
export async function GET(request: NextRequest) {
  try {
    // 🛡️ Segurança (Guardian Rules)
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const { searchParams } = new URL(request.url)
    const domainId = searchParams.get('domainId') || '1' // Padrão: Imobiliário

    const query = `
      SELECT id, domain_id, target_table, target_fk_column, layout_json, form_schema_json, is_active 
      FROM crm_segmentos_config 
      WHERE domain_id = $1 AND is_active = true
      ORDER BY updated_at DESC
    `
    const { rows } = await pool.query(query, [domainId])

    return NextResponse.json({
      success: true,
      config: rows
    })

  } catch (error: any) {
    console.error('❌ [CRM_CONFIG_API] Erro no GET:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar configuração de segmentos.', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Criar ou Atualizar configuração de segmento
export async function POST(request: NextRequest) {
  try {
    // 🛡️ Segurança (Guardian Rules)
    const permissionCheck = await unifiedPermissionMiddleware(request)
    if (permissionCheck) {
      return permissionCheck
    }

    const data = await request.json()
    const { 
      domain_id, 
      target_table, 
      target_fk_column, 
      layout_json, 
      form_schema_json = [], 
      is_active = true 
    } = data

    if (!domain_id || !target_table || !layout_json) {
      return NextResponse.json(
        { success: false, error: 'domain_id, target_table e layout_json são obrigatórios.' },
        { status: 400 }
      )
    }

    // UPSERT (Update or Insert)
    const query = `
      INSERT INTO crm_segmentos_config (domain_id, target_table, target_fk_column, layout_json, form_schema_json, is_active, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (domain_id) 
      DO UPDATE SET 
        target_table = EXCLUDED.target_table,
        target_fk_column = EXCLUDED.target_fk_column,
        layout_json = EXCLUDED.layout_json,
        form_schema_json = EXCLUDED.form_schema_json,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
      RETURNING id
    `
    
    const result = await pool.query(query, [
      domain_id,
      target_table,
      target_fk_column || 'imovel_id', // Fallback seguro
      JSON.stringify(layout_json),
      JSON.stringify(form_schema_json),
      is_active
    ])

    // Retro-processamento do Segment Builder 
    // Dispara atualização em background para que todos os leads em Staging e Kanban exibam a nova identidade visual.
    EnrichmentService.reEnrichAllLeads(Number(domain_id)).catch(err => {
        console.error('❌ Falha no re-enriquecimento após salvar o Segment Builder:', err)
    })

    return NextResponse.json({
      success: true,
      message: 'Configuração de segmento salva com sucesso.',
      id: result.rows[0].id
    })

  } catch (error: any) {
    console.error('❌ [CRM_CONFIG_API] Erro no POST:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao salvar configuração de segmento.', details: error.message },
      { status: 500 }
    )
  }
}

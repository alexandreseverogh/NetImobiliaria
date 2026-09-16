import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { requireApiPermission } from '@/lib/auth/apiPermissions'
import { getTokenFromRequest, verifyToken } from '@/lib/auth/jwt'
import { resolveAtivoConfig, IDENT_RE } from '@/lib/crm/resolveAtivoConfig'
import { EnrichmentService } from '@/lib/crm/enrichmentService'

/**
 * CRM SEGMENT BUILDER API — config de como um lead é enriquecido/vinculado a um item real
 * de inventário (imóvel, veículo, etc), por TENANT (com fallback ao padrão do segmento
 * curado pelo Master em /admin/master/segments).
 *
 * Reescrita em 2026-08-14 — a versão anterior (crm_segmentos_config, domain_id=1 cravado)
 * nunca teve auth real (unifiedPermissionMiddleware é fail-open pra rota sem entrada em
 * route_permissions_config) e nunca isolava por tenant (qualquer chamador sobrescrevia a
 * ÚNICA config global da plataforma). Ver docs/CHECKPOINT.md, 2026-08-14.
 */

async function getTenantId(request: NextRequest): Promise<string | null> {
  const token = getTokenFromRequest(request)
  if (!token) return null
  const decoded = await verifyToken(token)
  return decoded?.tenantId || null
}

// GET - Buscar configuração efetiva (override do tenant, senão padrão do segmento)
export async function GET(request: NextRequest) {
  try {
    const denied = await requireApiPermission(request, 'crm-segment-builder', 'READ')
    if (denied) return denied

    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
    }

    const tenantRes = await pool.query(
      `SELECT target_table, target_fk_column, target_name_column, target_label, layout_json, form_schema_json, is_active
         FROM crm_ativo_config_tenant WHERE tenant_id = $1::uuid`,
      [tenantId]
    )

    const effective = await resolveAtivoConfig(tenantId)

    return NextResponse.json({
      success: true,
      effective, // null quando nem tenant nem segmento têm config ainda
      tenantOverride: tenantRes.rows[0] || null,
    })
  } catch (error: any) {
    console.error('❌ [CRM_CONFIG_API] Erro no GET:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar configuração de segmento.', details: error.message },
      { status: 500 }
    )
  }
}

// POST - Criar/Atualizar o OVERRIDE do próprio tenant (nunca toca no padrão do segmento —
// isso é curado pelo Master em /admin/master/segments)
export async function POST(request: NextRequest) {
  try {
    const denied = await requireApiPermission(request, 'crm-segment-builder', 'UPDATE')
    if (denied) return denied

    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
    }

    const data = await request.json()
    let {
      target_table,
      target_fk_column,
      target_name_column,
      target_label,
      layout_json = {},
      form_schema_json = [],
      is_active = true,
    } = data

    // Vínculo Exato é opcional — mas ou vem os 3 campos de identificação juntos (tabela real
    // digitalizada), ou nenhum deles (tenant só com Perfil de Interesse). Nunca aceita
    // meio-configurado — e nunca aceita nome de tabela/coluna fora do padrão de identificador,
    // já que esses valores são interpolados em SQL cru (EnrichmentService) mais tarde.
    target_table = (target_table || '').trim() || null
    target_name_column = (target_name_column || '').trim() || null
    target_label = (target_label || '').trim() || null
    target_fk_column = (target_fk_column || '').trim() || null

    const temVinculoExato = !!(target_table || target_name_column || target_label)

    if (temVinculoExato) {
      if (!target_table || !target_name_column || !target_label) {
        return NextResponse.json(
          { success: false, error: 'Pra configurar Vínculo Exato, preencha Entidade/Tabela, Coluna de Nome e Rótulo juntos — ou deixe os 3 em branco pra usar só Perfil de Interesse.' },
          { status: 400 }
        )
      }
      if (!target_fk_column) target_fk_column = 'imovel_id'
      for (const [label, value] of [
        ['target_table', target_table],
        ['target_fk_column', target_fk_column],
        ['target_name_column', target_name_column],
      ] as const) {
        if (!IDENT_RE.test(value as string)) {
          return NextResponse.json(
            { success: false, error: `${label} inválido — use só letras, números e underscore, começando por letra.` },
            { status: 400 }
          )
        }
      }
    } else {
      target_table = null
      target_fk_column = null
      target_name_column = null
      target_label = null
    }

    await pool.query(
      `INSERT INTO crm_ativo_config_tenant
         (tenant_id, target_table, target_fk_column, target_name_column, target_label, layout_json, form_schema_json, is_active, updated_at)
       VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (tenant_id) DO UPDATE SET
         target_table = EXCLUDED.target_table,
         target_fk_column = EXCLUDED.target_fk_column,
         target_name_column = EXCLUDED.target_name_column,
         target_label = EXCLUDED.target_label,
         layout_json = EXCLUDED.layout_json,
         form_schema_json = EXCLUDED.form_schema_json,
         is_active = EXCLUDED.is_active,
         updated_at = NOW()`,
      [tenantId, target_table, target_fk_column, target_name_column, target_label, JSON.stringify(layout_json), JSON.stringify(form_schema_json), is_active]
    )

    // Retro-processamento em segundo plano — não bloqueia a resposta do save.
    EnrichmentService.reEnrichAllLeads(tenantId).catch(err => {
      console.error('❌ Falha no re-enriquecimento após salvar o Segment Builder:', err)
    })

    return NextResponse.json({ success: true, message: 'Configuração salva com sucesso.' })
  } catch (error: any) {
    console.error('❌ [CRM_CONFIG_API] Erro no POST:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao salvar configuração de segmento.', details: error.message },
      { status: 500 }
    )
  }
}

// DELETE - Remove o override do tenant, volta a herdar o padrão do segmento
export async function DELETE(request: NextRequest) {
  try {
    const denied = await requireApiPermission(request, 'crm-segment-builder', 'UPDATE')
    if (denied) return denied

    const tenantId = await getTenantId(request)
    if (!tenantId) {
      return NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 })
    }

    await pool.query('DELETE FROM crm_ativo_config_tenant WHERE tenant_id = $1::uuid', [tenantId])

    EnrichmentService.reEnrichAllLeads(tenantId).catch(err => {
      console.error('❌ Falha no re-enriquecimento após restaurar padrão do segmento:', err)
    })

    return NextResponse.json({ success: true, message: 'Padrão do segmento restaurado.' })
  } catch (error: any) {
    console.error('❌ [CRM_CONFIG_API] Erro no DELETE:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao restaurar padrão do segmento.', details: error.message },
      { status: 500 }
    )
  }
}

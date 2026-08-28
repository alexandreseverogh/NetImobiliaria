import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyTokenNode } from '@/lib/auth/jwt-node'
import { resolveSegment } from '@/lib/intelligence/segmentResolver'
import { resolvePromptTemplate } from '@/lib/intelligence/promptResolver'
import { getTenantRuleStats, decideRecalibrationSuggestion } from '@/lib/crm/agents/scoreRecalibrationService'

/**
 * CONFIGURAÇÃO DE IA DO CRM — QUALIFICAÇÃO DE LEAD (/crm/config/ia)
 *
 * O segmento é herdado via resolveSegment(tenantId, clientId) — o tenant não cria/escolhe
 * um "segmento" aqui, ele já pertence a um (public.system_segments, mesmo sistema usado em
 * toda a plataforma). As regras padrão do segmento são curadas pela Master
 * (/admin/master/segments); o tenant só edita as PRÓPRIAS regras (override/adição), sempre
 * escopadas ao seu tenant_id real. Ver src/lib/ai/conciergeService.ts pro motor que consome
 * este dado, e docs/CHECKPOINT.md pro contexto completo da reconstrução.
 */

function getCurrentUser(request: NextRequest): { userId: string, tenantId?: string, is_system_role?: boolean } | null {
  try {
    const token = request.cookies.get('admin_auth_token')?.value ||
      request.headers.get('authorization')?.replace('Bearer ', '')

    if (!token) return null

    const decoded = verifyTokenNode(token) as any
    if (!decoded) return null

    return {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      is_system_role: decoded.is_system_role === true
    }
  } catch (error) {
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const isMaster = currentUser.is_system_role === true

    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')
    const tenantId = isMaster ? (searchParams.get('tenant_id') || currentUser.tenantId) : currentUser.tenantId
    if (!tenantId) return NextResponse.json({ error: 'tenant_id necessário' }, { status: 400 })

    const segment = await resolveSegment(tenantId, clientId)
    if (!segment) {
      return NextResponse.json({ success: true, segment: null, prompt: null, segmentRules: [], tenantRules: [], segmentFitCriteria: [], tenantFitCriteria: [] })
    }

    const [promptContent, segmentRulesRes, tenantRulesRes, segmentFitRes, tenantFitRes, tenantSuggestionsRes] = await Promise.all([
      resolvePromptTemplate('crm_lead_qualification', { segmentId: segment.id, tenantId, clientId }),
      pool.query(
        `SELECT id, palavras_chave, tag_resultante, resumo_modelo, score_base, ordem, ativa
           FROM crm_qualificacao_regras_segmento
          WHERE segment_id = $1::uuid
          ORDER BY ordem ASC`,
        [segment.id],
      ),
      pool.query(
        `SELECT id, palavras_chave, tag_resultante, resumo_modelo, score_base, ordem, ativa
           FROM crm_qualificacao_regras_tenant
          WHERE tenant_id = $1::uuid
          ORDER BY ordem ASC`,
        [tenantId],
      ),
      pool.query(
        `SELECT id, criterio, peso, ordem, ativo
           FROM crm_fit_criterios_segmento
          WHERE segment_id = $1::uuid
          ORDER BY ordem ASC`,
        [segment.id],
      ),
      pool.query(
        `SELECT id, criterio, peso, ordem, ativo
           FROM crm_fit_criterios_tenant
          WHERE tenant_id = $1::uuid
          ORDER BY ordem ASC`,
        [tenantId],
      ),
      pool.query(
        `SELECT id, tag_resultante, score_atual, score_sugerido, leads_gerados, leads_convertidos,
                taxa_conversao_observada, created_at
           FROM crm_score_recalibration_suggestions
          WHERE scope = 'tenant' AND tenant_id = $1::uuid AND status = 'PENDING'
          ORDER BY created_at ASC`,
        [tenantId],
      ),
    ])

    // F5 — taxa de conversão real das PRÓPRIAS regras do tenant, computada ao vivo (mesma
    // razão de nunca persistir como coluna já documentada na migração F5).
    const tenantTags = tenantRulesRes.rows.map((r) => r.tag_resultante)
    const tenantStatsMap = await getTenantRuleStats(tenantId, tenantTags)
    const tenantStats = Object.fromEntries(tenantStatsMap.entries())

    return NextResponse.json({
      success: true,
      segment: {
        id: segment.id,
        name: segment.name,
        slug: segment.slug,
        icon: segment.icon,
        crm_ia_ativa: segment.crm_ia_ativa,
      },
      prompt: promptContent,
      segmentRules: segmentRulesRes.rows,
      tenantRules: tenantRulesRes.rows,
      segmentFitCriteria: segmentFitRes.rows,
      tenantFitCriteria: tenantFitRes.rows,
      tenantRuleStats: tenantStats,
      tenantRecalibrationSuggestions: tenantSuggestionsRes.rows,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = getCurrentUser(request)
    if (!currentUser?.tenantId) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    const tenantId = currentUser.tenantId

    const body = await request.json()
    const { action, data } = body

    if (action === 'saveRule') {
      const { id, palavras_chave, tag_resultante, resumo_modelo, score_base, ordem, ativa } = data || {}
      if (!palavras_chave?.trim() || !tag_resultante?.trim() || !resumo_modelo?.trim()) {
        return NextResponse.json({ error: 'Palavras-chave, tag e resumo são obrigatórios.' }, { status: 400 })
      }
      const score = Math.min(10, Math.max(0, Number(score_base) || 5))

      if (id) {
        const { rows } = await pool.query(
          `UPDATE crm_qualificacao_regras_tenant
              SET palavras_chave = $1, tag_resultante = $2, resumo_modelo = $3, score_base = $4,
                  ordem = COALESCE($5, ordem), ativa = COALESCE($6, ativa), updated_at = NOW()
            WHERE id = $7 AND tenant_id = $8
          RETURNING *`,
          [palavras_chave.trim(), tag_resultante.trim(), resumo_modelo.trim(), score, ordem ?? null, ativa ?? null, id, tenantId],
        )
        if (rows.length === 0) return NextResponse.json({ error: 'Regra não encontrada ou sem permissão.' }, { status: 404 })
        return NextResponse.json({ success: true, rule: rows[0] })
      }

      const { rows } = await pool.query(
        `INSERT INTO crm_qualificacao_regras_tenant (tenant_id, palavras_chave, tag_resultante, resumo_modelo, score_base, ordem)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [tenantId, palavras_chave.trim(), tag_resultante.trim(), resumo_modelo.trim(), score, ordem ?? 0],
      )
      return NextResponse.json({ success: true, rule: rows[0] })
    }

    if (action === 'deleteRule') {
      const { id } = data || {}
      if (!id) return NextResponse.json({ error: 'ID necessário' }, { status: 400 })
      const { rowCount } = await pool.query(
        `DELETE FROM crm_qualificacao_regras_tenant WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId],
      )
      if (!rowCount) return NextResponse.json({ error: 'Regra não encontrada ou sem permissão.' }, { status: 404 })
      return NextResponse.json({ success: true })
    }

    if (action === 'saveFitCriterion') {
      const { id, criterio, peso, ordem, ativo } = data || {}
      if (!criterio?.trim()) {
        return NextResponse.json({ error: 'Descreva o critério de encaixe.' }, { status: 400 })
      }
      const pesoNum = Math.min(10, Math.max(0, Number(peso) || 5))

      if (id) {
        const { rows } = await pool.query(
          `UPDATE crm_fit_criterios_tenant
              SET criterio = $1, peso = $2, ordem = COALESCE($3, ordem), ativo = COALESCE($4, ativo), updated_at = NOW()
            WHERE id = $5 AND tenant_id = $6
          RETURNING *`,
          [criterio.trim(), pesoNum, ordem ?? null, ativo ?? null, id, tenantId],
        )
        if (rows.length === 0) return NextResponse.json({ error: 'Critério não encontrado ou sem permissão.' }, { status: 404 })
        return NextResponse.json({ success: true, criterion: rows[0] })
      }

      const { rows } = await pool.query(
        `INSERT INTO crm_fit_criterios_tenant (tenant_id, criterio, peso, ordem)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [tenantId, criterio.trim(), pesoNum, ordem ?? 0],
      )
      return NextResponse.json({ success: true, criterion: rows[0] })
    }

    if (action === 'deleteFitCriterion') {
      const { id } = data || {}
      if (!id) return NextResponse.json({ error: 'ID necessário' }, { status: 400 })
      const { rowCount } = await pool.query(
        `DELETE FROM crm_fit_criterios_tenant WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId],
      )
      if (!rowCount) return NextResponse.json({ error: 'Critério não encontrado ou sem permissão.' }, { status: 404 })
      return NextResponse.json({ success: true })
    }

    if (action === 'applyRecalibration' || action === 'dismissRecalibration') {
      const { suggestionId } = data || {}
      if (!suggestionId) return NextResponse.json({ error: 'suggestionId necessário' }, { status: 400 })

      // Nunca confia em tenant_id vindo do body — confirma que a sugestão é deste tenant
      // antes de decidir (mesma disciplina de src/app/api/crm/agent/approvals/route.ts).
      const { rows } = await pool.query(
        `SELECT scope, tenant_id FROM crm_score_recalibration_suggestions WHERE id = $1::uuid`,
        [suggestionId],
      )
      if (!rows[0]) return NextResponse.json({ error: 'Sugestão não encontrada' }, { status: 404 })
      if (rows[0].scope !== 'tenant' || rows[0].tenant_id !== tenantId) {
        return NextResponse.json({ error: 'Sugestão não pertence a este tenant' }, { status: 403 })
      }

      const result = await decideRecalibrationSuggestion(suggestionId, action === 'applyRecalibration' ? 'apply' : 'dismiss')
      return NextResponse.json({ success: true, ...result })
    }

    return NextResponse.json({ error: 'Ação inválida.' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

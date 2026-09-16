import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { requireMaster } from '@/lib/crm/agents/debugAuth'

/**
 * Cria 1 regra de teste em crm_qualificacao_regras_tenant (nunca em _segmento — score_recalibration
 * só é chamado pelo painel no escopo 'tenant', mesma disciplina do CHECKPOINT de 2026-09-09) +
 * N leads sintéticos marcados com essa tag, uma fração deles convertida de verdade (coluna
 * is_ganho do tenant) — é o que computeStatsForTags (scoreRecalibrationService.ts) lê pra
 * calcular a taxa de conversão observada.
 */
export async function POST(request: NextRequest) {
  const denied = await requireMaster(request)
  if (denied) return denied

  const { tenantId, tag, scoreBase, leadsCount, conversionPct } = await request.json() as {
    tenantId?: string; tag?: string; scoreBase?: number; leadsCount?: number; conversionPct?: number
  }
  if (!tenantId || !tag) return NextResponse.json({ error: 'tenantId e tag são obrigatórios' }, { status: 400 })
  const n = Math.max(1, Math.min(200, Number(leadsCount) || 20))
  const pct = Math.max(0, Math.min(100, Number(conversionPct) ?? 50))
  const score = Math.max(1, Math.min(10, Number(scoreBase) || 5))
  const convertedCount = Math.round((n * pct) / 100)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    await client.query(
      `INSERT INTO public.crm_qualificacao_regras_tenant
         (tenant_id, palavras_chave, tag_resultante, resumo_modelo, score_base, ativa)
       VALUES ($1::uuid, 'teste-painel-debug', $2, 'Regra de teste do painel de debug de agentes.', $3, true)
       ON CONFLICT DO NOTHING`,
      [tenantId, tag, score],
    )

    const { rows: colunas } = await client.query(
      `SELECT id, is_ganho FROM public.kanban_colunas WHERE tenant_id = $1::uuid AND ativa = true`,
      [tenantId],
    )
    const ganhoCol = colunas.find((c) => c.is_ganho)?.id
    const naoGanhoCol = colunas.find((c) => !c.is_ganho)?.id
    if (!ganhoCol || !naoGanhoCol) throw new Error('Tenant sem colunas de Kanban configuradas (ganho + não-ganho)')

    for (let i = 0; i < n; i++) {
      const isConverted = i < convertedCount
      const { rows: leadRows } = await client.query(
        `INSERT INTO public.leads_staging (tenant_id, nome, telefone, tag_sonho, status)
         VALUES ($1::uuid, $2, $3, $4, 'lead_captado')
         RETURNING lead_uuid`,
        [tenantId, `TESTE RECAL — Lead ${i + 1} (${tag})`, `55810000${String(i).padStart(4, '0')}`, tag],
      )
      const leadUuid = leadRows[0].lead_uuid
      await client.query(
        `INSERT INTO public.leads_kanban (lead_uuid, coluna_id, tenant_id) VALUES ($1::uuid, $2, $3::uuid)`,
        [leadUuid, isConverted ? ganhoCol : naoGanhoCol, tenantId],
      )
    }

    await client.query('COMMIT')
    return NextResponse.json({ ok: true, tag, score, leadsCreated: n, convertedCount })
  } catch (err: any) {
    await client.query('ROLLBACK')
    return NextResponse.json({ error: err.message || 'Falha ao semear dados de teste' }, { status: 400 })
  } finally {
    client.release()
  }
}

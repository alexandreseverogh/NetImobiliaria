/**
 * Regras padrão de qualificação de lead por IA (CRM) + gate crm_ia_ativa, por segmento.
 *
 * GET /api/admin/master/segments/[id]/qualification-rules
 *   → { crmIaAtiva, rules: [{id, palavras_chave, tag_resultante, resumo_modelo, score_base, ordem, ativa}] }
 *
 * PUT /api/admin/master/segments/[id]/qualification-rules
 *   → salva as regras (replace-all transacional) + o toggle crmIaAtiva.
 *     Body: { crmIaAtiva: boolean, rules: [{palavras_chave, tag_resultante, resumo_modelo, score_base, ativa}] }
 *
 * Consumido por src/lib/ai/conciergeService.ts (motor de qualificação) e por
 * src/app/crm/CRMLayoutContent.tsx (gate de uso interno do CRM) — ver docs/CHECKPOINT.md.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';
import { getSegmentRuleStats } from '@/lib/crm/agents/scoreRecalibrationService';

export const dynamic = 'force-dynamic';

async function requireMaster(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;
  if (!decoded || !decoded.is_system_role) return null;
  return decoded;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireMaster(request))) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 });
  }
  try {
    const [segRes, rulesRes, suggestionsRes] = await Promise.all([
      pool.query(`SELECT crm_ia_ativa FROM public.system_segments WHERE id = $1::uuid LIMIT 1`, [params.id]),
      pool.query(
        `SELECT id, palavras_chave, tag_resultante, resumo_modelo, score_base, ordem, ativa
           FROM public.crm_qualificacao_regras_segmento
          WHERE segment_id = $1::uuid
          ORDER BY ordem ASC`,
        [params.id],
      ),
      pool.query(
        `SELECT id, tag_resultante, score_atual, score_sugerido, leads_gerados, leads_convertidos,
                taxa_conversao_observada, created_at
           FROM public.crm_score_recalibration_suggestions
          WHERE scope = 'segmento' AND segment_id = $1::uuid AND status = 'PENDING'
          ORDER BY created_at ASC`,
        [params.id],
      ),
    ]);
    if (segRes.rows.length === 0) {
      return NextResponse.json({ error: 'Segmento não encontrado' }, { status: 404 });
    }

    // F5 — taxa de conversão real por regra, computada ao vivo (nunca armazenada como
    // coluna da regra — ver comentário na migração F5 sobre o replace-all deste editor).
    const tags = rulesRes.rows.map((r) => r.tag_resultante);
    const statsMap = await getSegmentRuleStats(params.id, tags);
    const stats = Object.fromEntries(statsMap.entries());

    return NextResponse.json({
      crmIaAtiva: segRes.rows[0].crm_ia_ativa,
      rules: rulesRes.rows,
      stats,
      recalibrationSuggestions: suggestionsRes.rows,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireMaster(request))) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 });
  }
  const client = await pool.connect();
  try {
    const body = await request.json();
    const crmIaAtiva = body?.crmIaAtiva === true;
    const rules = Array.isArray(body?.rules) ? body.rules : [];

    for (const r of rules) {
      if (!r?.tag_resultante?.trim() || !r?.palavras_chave?.trim() || !r?.resumo_modelo?.trim()) {
        return NextResponse.json({ error: 'Cada regra precisa de tag, palavras-chave e resumo.' }, { status: 400 });
      }
    }

    await client.query('BEGIN');

    const segRes = await client.query(
      `UPDATE public.system_segments SET crm_ia_ativa = $1 WHERE id = $2::uuid RETURNING id`,
      [crmIaAtiva, params.id],
    );
    if (segRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Segmento não encontrado' }, { status: 404 });
    }

    await client.query(`DELETE FROM public.crm_qualificacao_regras_segmento WHERE segment_id = $1::uuid`, [params.id]);

    let inserted = 0;
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      await client.query(
        `INSERT INTO public.crm_qualificacao_regras_segmento
           (segment_id, palavras_chave, tag_resultante, resumo_modelo, score_base, ordem, ativa)
         VALUES ($1::uuid, $2, $3, $4, $5, $6, $7)`,
        [
          params.id,
          r.palavras_chave.trim(),
          r.tag_resultante.trim(),
          r.resumo_modelo.trim(),
          Math.min(10, Math.max(0, Number(r.score_base) || 5)),
          i,
          r.ativa !== false,
        ],
      );
      inserted++;
    }

    await client.query('COMMIT');
    return NextResponse.json({ ok: true, crmIaAtiva, inserted });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}

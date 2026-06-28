import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';

/**
 * GET  /api/admin/master/segments/[id]/benchmarks
 *   Retorna os benchmarks (system_benchmarks) do segmento.
 *
 * POST /api/admin/master/segments/[id]/benchmarks
 *   Body: { benchmarks: [{ metric_key, metric_label?, value, unit? }] }
 *   Upsert em system_benchmarks (fonte de verdade lida pelo benchmarkResolver).
 *
 * Acesso restrito a Master (is_system_role).
 */

export const dynamic = 'force-dynamic';

// Catálogo de todas as chaves gerenciadas pelo modal de parâmetros do agente.
const AGENT_KEYS: Record<string, { label: string; unit: string }> = {
  // Detecção — quando agir
  cpl_ideal:          { label: 'CPL Ideal (R$)',               unit: 'BRL' },
  cpl_critical:       { label: 'CPL Crítico (R$)',             unit: 'BRL' },
  ctr_min:            { label: 'CTR Mínimo (%)',               unit: 'PCT' },
  ctr_scale:          { label: 'CTR p/ Escalar (%)',           unit: 'PCT' },
  frequency_max:      { label: 'Frequência Máxima',            unit: 'NUM' },
  spend_no_lead:      { label: 'Gasto sem Lead (R$)',          unit: 'BRL' },
  min_leads_scale:    { label: 'Leads Mín. p/ Escalar',        unit: 'NUM' },
  min_days_running:   { label: 'Dias Mín. Rodando',            unit: 'NUM' },
  hook_rate_critical: { label: 'Hook Rate Crítico (%)',        unit: 'PCT' },
  hook_rate_min:      { label: 'Hook Rate Mínimo (%)',         unit: 'PCT' },
  // Execução — como agir
  scale_budget_base_pct:  { label: 'Escala Base (%)',                  unit: 'PCT' },
  scale_budget_max_pct:   { label: 'Escala Máxima (%)',                unit: 'PCT' },
  scale_ratio_cap:        { label: 'CTR Cap (×threshold)',             unit: 'NUM' },
  downscale_budget_pct:   { label: 'Redução de Budget (%)',            unit: 'PCT' },
  scale_budget_max:       { label: 'Teto Absoluto (R$)',               unit: 'BRL' },
  scale_budget_pct:       { label: 'Escala Legada (%)',                unit: 'PCT' },
  // Sinais & Aprendizado
  cpm_delta_max:         { label: 'CPM Delta Máx (%)',                 unit: 'PCT' },
  fir_floor:             { label: 'First Impression Ratio Mín',        unit: 'NUM' },
  learning_conv_target:  { label: 'Conversões p/ Sair do Learning',    unit: 'NUM' },
  pressure_w_engagement: { label: 'Peso Engagement (Pressão)',         unit: 'NUM' },
  pressure_w_conversion: { label: 'Peso Conversão (Pressão)',          unit: 'NUM' },
  pressure_w_quality:    { label: 'Peso Qualidade (Pressão)',          unit: 'NUM' },
};

async function getPayload(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  return token ? await verifyToken(token) : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const decoded = await getPayload(request);
  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 });
  }

  try {
    const { rows } = await pool.query(
      `SELECT metric_key, metric_label, value, unit, description
       FROM public.system_benchmarks
       WHERE segment_id = $1::uuid
       ORDER BY metric_key`,
      [params.id],
    );
    return NextResponse.json({ benchmarks: rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const decoded = await getPayload(request);
  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 });
  }

  let body: { benchmarks?: Array<{ metric_key: string; metric_label?: string; value: number; unit?: string }> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const benchmarks = body.benchmarks ?? [];
  if (!Array.isArray(benchmarks) || benchmarks.length === 0) {
    return NextResponse.json({ error: 'benchmarks deve ser um array não vazio' }, { status: 400 });
  }

  try {
    for (const b of benchmarks) {
      if (!b.metric_key || b.value === undefined || b.value === null) continue;
      const meta = AGENT_KEYS[b.metric_key];
      const label = b.metric_label ?? meta?.label ?? b.metric_key;
      const unit  = b.unit ?? meta?.unit ?? 'BRL';
      await pool.query(
        `INSERT INTO public.system_benchmarks (segment_id, metric_key, metric_label, value, unit)
         VALUES ($1::uuid, $2, $3, $4, $5)
         ON CONFLICT (segment_id, metric_key)
         DO UPDATE SET value = EXCLUDED.value, metric_label = EXCLUDED.metric_label,
                       unit = EXCLUDED.unit, updated_at = now()`,
        [params.id, b.metric_key, label, b.value, unit],
      );
    }
    return NextResponse.json({ ok: true, updated: benchmarks.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';

export const dynamic = 'force-dynamic';

/**
 * GET  /api/admin/campanhas/intelligence/benchmarks/tenant
 * Returns all benchmark values for the authenticated tenant (merged: segment defaults + tenant overrides).
 *
 * POST /api/admin/campanhas/intelligence/benchmarks/tenant
 * Body: { overrides: Array<{ metric_key, value, note? }> }
 * Upserts tenant-level benchmark overrides (only the provided keys are touched).
 */

export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const tenantId = payload.tenantId;

    // Resolve segment for this tenant
    const segRes = await pool.query(
      `SELECT segment_id FROM public.tenants WHERE id = $1::uuid LIMIT 1`,
      [tenantId],
    );
    const segmentId: string | null = segRes.rows[0]?.segment_id ?? null;

    // Segment defaults
    const defaults = segmentId
      ? await pool.query(
          `SELECT metric_key, metric_label, value, unit, description
           FROM public.system_benchmarks
           WHERE segment_id = $1::uuid
           ORDER BY metric_key`,
          [segmentId],
        )
      : { rows: [] };

    // Tenant overrides
    const overrides = await pool.query(
      `SELECT metric_key, value, note, updated_at
       FROM public.tenant_benchmark_overrides
       WHERE tenant_id = $1::uuid
       ORDER BY metric_key`,
      [tenantId],
    );

    // Merge: override wins
    const overrideMap: Record<string, any> = {};
    for (const o of overrides.rows) overrideMap[o.metric_key] = o;

    const merged = defaults.rows.map((d: any) => ({
      metric_key:   d.metric_key,
      metric_label: d.metric_label,
      unit:         d.unit,
      description:  d.description,
      segment_value: parseFloat(d.value),
      tenant_value:  overrideMap[d.metric_key] ? parseFloat(overrideMap[d.metric_key].value) : null,
      effective_value: overrideMap[d.metric_key]
        ? parseFloat(overrideMap[d.metric_key].value)
        : parseFloat(d.value),
      note:         overrideMap[d.metric_key]?.note ?? null,
      has_override: !!overrideMap[d.metric_key],
    }));

    return NextResponse.json({ benchmarks: merged, segment_id: segmentId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const tenantId = payload.tenantId;

    const body = await request.json();
    const overrides: Array<{ metric_key: string; value: number; note?: string }> = body.overrides ?? [];

    if (!Array.isArray(overrides) || overrides.length === 0) {
      return NextResponse.json({ error: 'overrides deve ser um array não vazio' }, { status: 400 });
    }

    for (const o of overrides) {
      if (!o.metric_key || o.value === undefined) {
        return NextResponse.json({ error: 'Cada override precisa de metric_key e value' }, { status: 400 });
      }
      await pool.query(
        `INSERT INTO public.tenant_benchmark_overrides (tenant_id, metric_key, value, note)
         VALUES ($1::uuid, $2, $3, $4)
         ON CONFLICT (tenant_id, metric_key)
         DO UPDATE SET value = EXCLUDED.value, note = EXCLUDED.note, updated_at = now()`,
        [tenantId, o.metric_key, o.value, o.note ?? null],
      );
    }

    return NextResponse.json({ ok: true, updated: overrides.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const tenantId = payload.tenantId;

    const { searchParams } = new URL(request.url);
    const metricKey = searchParams.get('metric_key');
    if (!metricKey) {
      return NextResponse.json({ error: 'metric_key é obrigatório' }, { status: 400 });
    }

    await pool.query(
      `DELETE FROM public.tenant_benchmark_overrides WHERE tenant_id = $1::uuid AND metric_key = $2`,
      [tenantId, metricKey],
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

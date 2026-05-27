import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';

export const dynamic = 'force-dynamic';

/**
 * GET  /api/admin/campanhas/intelligence/benchmarks/client?clientId=<uuid>
 * Returns merged benchmarks for a specific client
 * (segment default → tenant override → client override, showing all layers).
 *
 * POST /api/admin/campanhas/intelligence/benchmarks/client
 * Body: { clientId, overrides: Array<{ metric_key, value, note? }> }
 * Upserts client-level benchmark overrides.
 *
 * DELETE /api/admin/campanhas/intelligence/benchmarks/client?clientId=<uuid>&metric_key=<key>
 * Removes a client override (falls back to tenant/segment default).
 */

export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const tenantId = payload.tenantId;

    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');
    if (!clientId) {
      return NextResponse.json({ error: 'clientId é obrigatório' }, { status: 400 });
    }

    // Resolve effective segment: client first, then tenant
    const segRes = await pool.query(
      `SELECT COALESCE(c.segment_id, t.segment_id) AS segment_id
       FROM public.clientes c
       JOIN public.tenants t ON t.id = $2::uuid
       WHERE c.uuid = $1::uuid AND c.tenant_id = $2::uuid
       LIMIT 1`,
      [clientId, tenantId],
    );
    const segmentId: string | null = segRes.rows[0]?.segment_id ?? null;

    // Segment defaults
    const defaults = segmentId
      ? (await pool.query(
          `SELECT metric_key, metric_label, value AS segment_value, unit, description
           FROM public.system_benchmarks
           WHERE segment_id = $1::uuid
           ORDER BY metric_key`,
          [segmentId],
        )).rows
      : [];

    // Tenant overrides
    const tenantOverrides: Record<string, number> = {};
    const tRes = await pool.query(
      `SELECT metric_key, value FROM public.tenant_benchmark_overrides WHERE tenant_id = $1::uuid`,
      [tenantId],
    );
    for (const r of tRes.rows) tenantOverrides[r.metric_key] = parseFloat(r.value);

    // Client overrides
    const clientOverrides: Record<string, { value: number; note: string | null }> = {};
    const cRes = await pool.query(
      `SELECT metric_key, value, note FROM public.client_benchmark_overrides WHERE client_id = $1::uuid`,
      [clientId],
    );
    for (const r of cRes.rows) clientOverrides[r.metric_key] = { value: parseFloat(r.value), note: r.note };

    const benchmarks = defaults.map((d: any) => {
      const segVal  = parseFloat(d.segment_value);
      const tenVal  = tenantOverrides[d.metric_key] ?? null;
      const cliObj  = clientOverrides[d.metric_key] ?? null;
      const effVal  = cliObj?.value ?? tenVal ?? segVal;

      return {
        metric_key:      d.metric_key,
        metric_label:    d.metric_label,
        unit:            d.unit,
        description:     d.description,
        segment_value:   segVal,
        tenant_value:    tenVal,
        client_value:    cliObj?.value ?? null,
        effective_value: effVal,
        note:            cliObj?.note ?? null,
        override_level:  cliObj ? 'client' : tenVal !== null ? 'tenant' : 'segment',
      };
    });

    return NextResponse.json({ benchmarks, segment_id: segmentId });
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
    const { clientId, overrides } = body as {
      clientId: string;
      overrides: Array<{ metric_key: string; value: number; note?: string }>;
    };

    if (!clientId || !Array.isArray(overrides) || overrides.length === 0) {
      return NextResponse.json({ error: 'clientId e overrides são obrigatórios' }, { status: 400 });
    }

    // Verify client belongs to this tenant
    const check = await pool.query(
      `SELECT uuid FROM public.clientes WHERE uuid = $1::uuid AND tenant_id = $2::uuid LIMIT 1`,
      [clientId, tenantId],
    );
    if (!check.rows[0]) {
      return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 });
    }

    for (const o of overrides) {
      await pool.query(
        `INSERT INTO public.client_benchmark_overrides (client_id, tenant_id, metric_key, value, note)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5)
         ON CONFLICT (client_id, metric_key)
         DO UPDATE SET value = EXCLUDED.value, note = EXCLUDED.note, updated_at = now()`,
        [clientId, tenantId, o.metric_key, o.value, o.note ?? null],
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
    const clientId  = searchParams.get('clientId');
    const metricKey = searchParams.get('metric_key');
    if (!clientId || !metricKey) {
      return NextResponse.json({ error: 'clientId e metric_key são obrigatórios' }, { status: 400 });
    }

    await pool.query(
      `DELETE FROM public.client_benchmark_overrides
       WHERE client_id = $1::uuid AND tenant_id = $2::uuid AND metric_key = $3`,
      [clientId, tenantId, metricKey],
    );

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

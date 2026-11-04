import { NextRequest, NextResponse } from 'next/server';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import { resolveSegment } from '@/lib/intelligence/segmentResolver';
import pool from '@/lib/database/connection';
import {
  getEffectiveMetrics,
  getTenantMetrics,
  getClientMetrics,
  saveTenantMetrics,
  saveClientMetrics,
  deleteTenantMetrics,
  deleteClientMetrics,
  getSegmentMetrics,
  type SegmentMetric,
} from '@/lib/marketing/services/segmentMetricCatalogService';

/**
 * Override de MÉTRICAS CURADAS por tenant/cliente — cascata Segmento → Tenant → Cliente (ver
 * docs/CHECKPOINT.md, plano "typed-percolating-riddle"). Mesma família/convenção de
 * `settings/llm/route.ts` (mesma pasta, mesmo padrão de auth via `getTokenPayload`).
 *
 * GET  ?clientId=<uuid opcional>   → efetivo + override próprio deste escopo + referência
 * PUT  { clientId?, metrics[] }    → replace-all no nível certo (tenant sem clientId, cliente com)
 * DELETE ?clientId=<uuid opcional> → restaura herança no nível certo (DELETE real, nunca "salva vazio")
 */
export const dynamic = 'force-dynamic';

/** Master pode inspecionar/editar outro tenant via `?tenant_id=` explícito (mesmo padrão já
 * usado em `/api/crm/prompt-overrides`); tenant comum nunca sai do próprio escopo. */
function resolveTenantId(
  request: NextRequest,
  payload: { tenantId?: string; is_system_role?: boolean },
  searchParams: URLSearchParams,
): string | null {
  const isMaster = payload.is_system_role === true;
  return isMaster ? (searchParams.get('tenant_id') || payload.tenantId || null) : (payload.tenantId || null);
}

// GET /api/admin/campanhas/settings/metrics?clientId=<uuid opcional>
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId && !payload?.is_system_role) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const { searchParams } = new URL(request.url);
    const tenantId = resolveTenantId(request, payload, searchParams);
    if (!tenantId) return NextResponse.json({ error: 'tenant_id necessário' }, { status: 400 });
    const clientId = searchParams.get('clientId') || null;
    const editingLevel: 'tenant' | 'client' = clientId ? 'client' : 'tenant';

    const [{ metrics: resolvedMetrics, resolvedLevel }, overrideRows] = await Promise.all([
      getEffectiveMetrics(tenantId, clientId),
      clientId ? getClientMetrics(tenantId, clientId) : getTenantMetrics(tenantId),
    ]);
    const overrideMetrics: SegmentMetric[] | null = overrideRows.length > 0 ? overrideRows : null;

    // Referência "o que o segmento curou" pra ESTE escopo específico, sempre disponível pra
    // comparação (mesmo espírito do masterReferenceContent de prompts) — cliente's próprio
    // segmento se ele tiver um; senão o segmento do tenant.
    let referenceSegment: { id: string; name: string } | null = null;
    if (clientId) {
      const { rows } = await pool.query<{ segment_id: string | null; name: string | null }>(
        `SELECT c.segment_id, s.name
           FROM public.clientes c
           LEFT JOIN public.system_segments s ON s.id = c.segment_id
          WHERE c.uuid = $1::uuid LIMIT 1`,
        [clientId],
      );
      if (rows[0]?.segment_id && rows[0].name) {
        referenceSegment = { id: rows[0].segment_id, name: rows[0].name };
      }
    }
    if (!referenceSegment) {
      const tenantSegment = await resolveSegment(tenantId, null);
      if (tenantSegment) referenceSegment = { id: tenantSegment.id, name: tenantSegment.name };
    }
    const segmentReferenceMetrics = referenceSegment ? await getSegmentMetrics(referenceSegment.id) : [];

    return NextResponse.json({
      resolvedMetrics,
      resolvedLevel,
      overrideMetrics,
      segment: referenceSegment ? { id: referenceSegment.id, name: referenceSegment.name } : null,
      segmentReferenceMetrics,
      editingLevel,
    });
  } catch (error: any) {
    console.error('GET /settings/metrics error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao carregar métricas' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const denied = await requireApiPermission(request, 'configuracoes-campanhas', 'UPDATE');
  if (denied) return denied;
  try {
    const payload = getTokenPayload(request);
    const { searchParams } = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const tenantId = resolveTenantId(request, payload || {}, searchParams) || body?.tenantId;
    if (!tenantId) return NextResponse.json({ error: 'tenant_id necessário' }, { status: 400 });

    const clientId: string | null = body?.clientId || null;
    const metrics = body?.metrics as Partial<SegmentMetric>[];
    if (!Array.isArray(metrics)) {
      return NextResponse.json({ error: 'Campo "metrics" deve ser um array' }, { status: 400 });
    }

    const inserted = clientId
      ? await saveClientMetrics(tenantId, clientId, metrics)
      : await saveTenantMetrics(tenantId, metrics);

    return NextResponse.json({ ok: true, inserted });
  } catch (error: any) {
    console.error('PUT /settings/metrics error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao salvar métricas' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const denied = await requireApiPermission(request, 'configuracoes-campanhas', 'UPDATE');
  if (denied) return denied;
  try {
    const payload = getTokenPayload(request);
    const { searchParams } = new URL(request.url);
    const tenantId = resolveTenantId(request, payload || {}, searchParams);
    if (!tenantId) return NextResponse.json({ error: 'tenant_id necessário' }, { status: 400 });

    const clientId = searchParams.get('clientId') || null;
    if (clientId) await deleteClientMetrics(tenantId, clientId);
    else await deleteTenantMetrics(tenantId);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('DELETE /settings/metrics error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao restaurar herança' }, { status: 500 });
  }
}

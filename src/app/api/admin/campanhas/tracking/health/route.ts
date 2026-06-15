/**
 * GET  /api/admin/campanhas/tracking/health
 *   → retorna o check mais recente + histórico dos últimos 30 dias
 *
 * POST /api/admin/campanhas/tracking/health
 *   → executa um novo health check e persiste o resultado
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import {
  runTrackingHealthCheck,
  saveTrackingHealthCheck,
  getTrackingHealthHistory,
} from '@/lib/marketing/services/trackingHealthService';

export const dynamic = 'force-dynamic';

/* ── GET — latest + history ────────────────────────────────── */

export async function GET(request: NextRequest) {
  const denied = await requireApiPermission(request, 'dashboard-campanhas', 'READ');
  if (denied) return denied;

  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawClientId = searchParams.get('clientId');
  const segmentId   = searchParams.get('segmentId') || null;
  // 'own' significa "Minha Empresa" (sem clientId); não é um UUID válido
  const clientId = (rawClientId && rawClientId !== 'own') ? rawClientId : null;

  try {
    const history = await getTrackingHealthHistory(payload.tenantId, 30, clientId, segmentId);
    const latest  = history[0] ?? null;

    return NextResponse.json({
      latest,
      history: history.map(h => ({
        id:           h.id,
        overallScore: h.overallScore,
        issueCount:   (h.issues as any[]).length,
        createdAt:    h.createdAt,
      })),
    });
  } catch (e: any) {
    console.error('[tracking/health GET]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/* ── POST — run new check ──────────────────────────────────── */

export async function POST(request: NextRequest) {
  const denied = await requireApiPermission(request, 'dashboard-campanhas', 'READ');
  if (denied) return denied;

  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  let clientId: string | null = null;
  let segmentId: string | null = null;
  try {
    const body = await request.json().catch(() => ({}));
    const raw = body.clientId ?? null;
    // 'own' significa "Minha Empresa" (sem clientId); não é um UUID válido
    clientId = (raw && raw !== 'own') ? raw : null;
    segmentId = body.segmentId ?? null;
  } catch { /* ignore */ }

  // URL base para o check do endpoint (usa PUBLIC_URL ou o host da request)
  const host    = request.headers.get('host') ?? 'localhost:3000';
  const proto   = process.env.PUBLIC_URL?.startsWith('https') ? 'https' : 'http';
  const baseUrl = process.env.PUBLIC_URL ?? `${proto}://${host}`;

  try {
    const result = await runTrackingHealthCheck(payload.tenantId, clientId, baseUrl, segmentId);
    const id     = await saveTrackingHealthCheck(payload.tenantId, result, clientId);

    return NextResponse.json({ id, ...result });
  } catch (e: any) {
    console.error('[tracking/health POST]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

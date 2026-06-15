/**
 * FASE 9 — Audit Report API
 *
 * GET  /api/admin/campanhas/auditoria
 *   → lista relatórios históricos (até 12)
 *
 * POST /api/admin/campanhas/auditoria
 *   → gera um novo relatório e persiste
 *   Body: { periodDays?: number; withNarrative?: boolean; clientId?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import {
  generateAuditReport,
  saveAuditReport,
  listAuditReports,
} from '@/lib/marketing/services/auditReportService';

export const dynamic = 'force-dynamic';

/* ── GET — list historical reports ────────────────────────── */

export async function GET(request: NextRequest) {
  const denied = await requireApiPermission(request, 'dashboard-campanhas', 'READ');
  if (denied) return denied;

  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const rawClientId = searchParams.get('clientId') || null;
  // 'segment' (= Todos os Clientes) é sentinela de UI → sem filtro de cliente.
  // 'own' é preservado (campanhas próprias = client_id IS NULL, tratado no service).
  const clientId = rawClientId === 'segment' ? null : rawClientId;
  const limit    = parseInt(searchParams.get('limit') ?? '12');

  try {
    const reports = await listAuditReports(payload.tenantId, clientId, limit);
    return NextResponse.json({ reports });
  } catch (e: any) {
    console.error('[auditoria GET]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/* ── POST — generate + save new report ─────────────────────── */

export async function POST(request: NextRequest) {
  const denied = await requireApiPermission(request, 'dashboard-campanhas', 'READ');
  if (denied) return denied;

  const payload = getTokenPayload(request);
  if (!payload?.tenantId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const periodDays    = Number(body.periodDays ?? 30);
  const withNarrative = Boolean(body.withNarrative ?? false);
  // 'segment' (Todos os Clientes) → sem filtro de cliente; 'own' preservado p/ o service
  const rawClientId   = body.clientId ?? null;
  const clientId      = rawClientId === 'segment' ? null : rawClientId;
  const campaignId    = body.campaignId ?? null;

  if (![7, 14, 30, 60, 90].includes(periodDays)) {
    return NextResponse.json({ error: 'periodDays inválido. Use: 7, 14, 30, 60 ou 90.' }, { status: 400 });
  }

  try {
    const report = await generateAuditReport(
      payload.tenantId,
      clientId,
      periodDays,
      withNarrative,
      campaignId,
    );

    const id = await saveAuditReport(report);

    return NextResponse.json({ ...report, id });
  } catch (e: any) {
    console.error('[auditoria POST]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

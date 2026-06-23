import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { executeAction } from '@/lib/marketing/services/agentDecisor';
import { prisma } from '@/lib/marketing/prisma';

export const dynamic = 'force-dynamic';

function getPayload(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.replace('Bearer ', '');
  if (!token) return null;
  try {
    const base64 = token.split('.')[1];
    return JSON.parse(Buffer.from(base64, 'base64url').toString());
  } catch {
    return null;
  }
}

// GET /api/admin/master/aprovacoes
// Lista AgentActions. Tenant admins veem apenas o seu próprio tenant (isolamento via JWT).
export async function GET(req: NextRequest) {
  const payload = getPayload(req);
  if (!payload?.userId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status  = searchParams.get('status') ?? 'PENDING_APPROVAL';
  const limit  = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
  const offset = parseInt(searchParams.get('offset') ?? '0');

  // Tenant do JWT tem prioridade — garante isolamento para tenant admins.
  // Masters (sem tenantId no JWT) podem filtrar opcionalmente via query param.
  const jwtTenantId = payload.tenantId ?? null;
  const tenantId = jwtTenantId ?? (searchParams.get('tenantId') ?? null);

  try {
    const conditions: string[] = [`a.status = $1`];
    const params: any[] = [status];

    if (tenantId) {
      params.push(tenantId);
      conditions.push(`a.tenant_id = $${params.length}::uuid`);
    }

    const where = conditions.join(' AND ');

    const { rows } = await pool.query(
      `SELECT
         a.id,
         a."campaignId",
         a."campaignName",
         a.type,
         a.title,
         a.description,
         a.confidence,
         a.status,
         a."createdAt",
         a."executedAt",
         a.tenant_id,
         a.approval_pin_exp,
         t.name AS tenant_name
       FROM campanhasmarketingdigital."AgentAction" a
       LEFT JOIN public.tenants t ON t.id = a.tenant_id
       WHERE ${where}
       ORDER BY a."createdAt" DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) AS total FROM campanhasmarketingdigital."AgentAction" a WHERE ${where}`,
      params,
    );

    return NextResponse.json({ actions: rows, total: parseInt(countRows[0].total) });
  } catch (err: any) {
    console.error('[aprovacoes GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/admin/master/aprovacoes
// Body: { id: string, decision: 'approve' | 'reject', reason?: string }
// Aprovação sem PIN — autenticação via JWT é suficiente (painel admin protegido)
export async function POST(req: NextRequest) {
  const payload = getPayload(req);
  if (!payload?.userId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  let body: { id: string; decision: 'approve' | 'reject'; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  if (!body.id || !['approve', 'reject'].includes(body.decision)) {
    return NextResponse.json({ error: 'id e decision (approve|reject) são obrigatórios' }, { status: 400 });
  }

  try {
    const action = await prisma.agentAction.findUnique({ where: { id: body.id } });

    if (!action) {
      return NextResponse.json({ error: 'Ação não encontrada' }, { status: 404 });
    }
    if (action.status !== 'PENDING_APPROVAL') {
      return NextResponse.json({ error: `Status atual "${action.status}" não permite esta operação` }, { status: 409 });
    }

    if (body.decision === 'reject') {
      await prisma.agentAction.update({
        where: { id: body.id },
        data: { status: 'REJECTED', executedAt: new Date() },
      });
      return NextResponse.json({ ok: true, status: 'REJECTED' });
    }

    // approve
    await prisma.agentAction.update({
      where: { id: body.id },
      data: { status: 'PENDING_EXECUTION' },
    });

    try {
      await executeAction(action, action.tenantId ?? null);
      return NextResponse.json({ ok: true, status: 'EXECUTED' });
    } catch (execErr: any) {
      // Rollback para PENDING_APPROVAL se a execução falhar
      await prisma.agentAction.update({
        where: { id: body.id },
        data: { status: 'PENDING_APPROVAL' },
      });
      return NextResponse.json({ error: `Aprovação registrada, mas execução falhou: ${execErr.message}` }, { status: 502 });
    }
  } catch (err: any) {
    console.error('[aprovacoes POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

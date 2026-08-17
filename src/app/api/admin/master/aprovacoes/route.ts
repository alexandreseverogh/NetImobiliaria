import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { executeAction } from '@/lib/marketing/services/agentDecisor';
import { prisma } from '@/lib/marketing/prisma';
import { verifyTokenNode } from '@/lib/auth/jwt-node';

export const dynamic = 'force-dynamic';

/**
 * Achado real (docs/CHECKPOINT.md, 2026-08-14): esta rota autenticava decodificando o payload
 * cru do JWT (base64) sem NUNCA verificar a assinatura — qualquer token forjado com um
 * `userId` qualquer passava. Como o POST executa de verdade ações ofensivas do agente (SCALE,
 * REALLOCATE_BUDGET — mexem em orçamento real), isso era uma falha grave, não teórica.
 * Corrigido pro mesmo padrão real (verifyTokenNode) já usado no resto da plataforma.
 */
function getCurrentUser(req: NextRequest): { userId: string; tenantId?: string; is_system_role?: boolean } | null {
  try {
    const token = req.cookies.get('admin_auth_token')?.value ||
      req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return null;
    const decoded = verifyTokenNode(token) as any;
    if (!decoded?.userId) return null;
    return { userId: decoded.userId, tenantId: decoded.tenantId, is_system_role: decoded.is_system_role === true };
  } catch {
    return null;
  }
}

// GET /api/admin/master/aprovacoes
export async function GET(req: NextRequest) {
  const currentUser = getCurrentUser(req);
  if (!currentUser) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const status  = searchParams.get('status') ?? 'PENDING_APPROVAL';
  const limit   = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
  const offset  = parseInt(searchParams.get('offset') ?? '0');

  const isMaster = currentUser.is_system_role === true;
  // Master pode inspecionar qualquer tenant (ou todos, se não passar nenhum) — mesmo padrão
  // já usado em /api/crm/pendencia/resgate. Tenant comum NUNCA sai do próprio escopo: nunca
  // confia em tenantId vindo da query pra quem não é Master (era exatamente essa a brecha —
  // antes, sem tenantId no JWT forjado, o parâmetro de query decidia sozinho).
  const tenantId = isMaster ? (searchParams.get('tenantId') || null) : currentUser.tenantId;
  if (!isMaster && !tenantId) {
    return NextResponse.json({ error: 'Sessão sem tenant associado' }, { status: 403 });
  }

  // EXPIRED é tratado como status virtual: PENDING_APPROVAL com pin expirado
  const isExpired = status === 'EXPIRED';

  try {
    const conditions: string[] = isExpired
      ? [`a.status = 'PENDING_APPROVAL'`, `a.approval_pin_exp < NOW()`]
      : [`a.status = $1`];
    const params: any[] = isExpired ? [] : [status];

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
         -- scale_pct: usa o valor gravado pelo algoritmo; se NULL (ação antiga), resolve do benchmark do segmento
         COALESCE(
           a.scale_pct,
           (SELECT sb.value::int FROM public.system_benchmarks sb
            WHERE sb.metric_key = 'scale_budget_base_pct'
              AND sb.segment_id = COALESCE(cl.segment_id, t.segment_id)
            LIMIT 1),
           (SELECT sb.value::int FROM public.system_benchmarks sb
            WHERE sb.metric_key = 'scale_budget_pct'
              AND sb.segment_id = COALESCE(cl.segment_id, t.segment_id)
            LIMIT 1),
           20
         )                                                AS scale_pct,
         (a.scale_pct IS NULL)                           AS scale_pct_from_bm,
         a.budget_proposed,
         a.budget_before,
         a.budget_after,
         t.name                                          AS tenant_name,
         cl.nome                                         AS client_name,
         COALESCE(seg.name, tseg.name)                   AS segment_name,
         COALESCE(SUM(ads."dailyBudget"), 0)::int         AS current_budget
       FROM campanhasmarketingdigital."AgentAction" a
       LEFT JOIN public.tenants t          ON t.id = a.tenant_id
       LEFT JOIN campanhasmarketingdigital."Campaign" cam ON cam.id = a."campaignId"
       LEFT JOIN public.clientes cl        ON cl.uuid = cam.client_id
       LEFT JOIN public.system_segments seg  ON seg.id = cl.segment_id
       LEFT JOIN public.system_segments tseg ON tseg.id = t.segment_id
       LEFT JOIN campanhasmarketingdigital."AdSet" ads    ON ads."campaignId" = a."campaignId"
       WHERE ${where}
       GROUP BY a.id, a."campaignId", a."campaignName", a.type, a.title, a.description,
                a.confidence, a.status, a."createdAt", a."executedAt", a.tenant_id,
                a.approval_pin_exp, a.scale_pct, a.budget_proposed, a.budget_before, a.budget_after,
                t.name, cl.nome, seg.name, tseg.name, cl.segment_id, t.segment_id
       ORDER BY a."createdAt" DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) AS total FROM campanhasmarketingdigital."AgentAction" a
       LEFT JOIN campanhasmarketingdigital."Campaign" cam ON cam.id = a."campaignId"
       LEFT JOIN public.clientes cl ON cl.uuid = cam.client_id
       WHERE ${where}`,
      params,
    );

    return NextResponse.json({ actions: rows, total: parseInt(countRows[0].total) });
  } catch (err: any) {
    console.error('[aprovacoes GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/admin/master/aprovacoes
// Body: { id, decision: 'approve' | 'reject', customBudget?: number (centavos) }
export async function POST(req: NextRequest) {
  const currentUser = getCurrentUser(req);
  if (!currentUser) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  let body: { id: string; decision: 'approve' | 'reject'; customBudget?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  if (!body.id || !['approve', 'reject'].includes(body.decision)) {
    return NextResponse.json({ error: 'id e decision (approve|reject) são obrigatórios' }, { status: 400 });
  }

  try {
    const rows = await prisma.$queryRaw<any[]>`
      SELECT id, tenant_id AS "tenantId", "campaignId", "campaignName", type, title, description, confidence, status
      FROM campanhasmarketingdigital."AgentAction" WHERE id = ${body.id} LIMIT 1`;
    const action = rows[0];

    if (!action) {
      return NextResponse.json({ error: 'Ação não encontrada' }, { status: 404 });
    }

    // Nunca confia no id sozinho pra decidir — resolve a ação real e compara contra o tenant
    // da sessão antes de aprovar/rejeitar (Master bypassa). Fechava aqui o 2º problema real:
    // mesmo com assinatura válida, qualquer tenant conseguia decidir a ação de OUTRO tenant só
    // sabendo o id (nenhuma checagem de posse existia antes deste fix).
    const isMaster = currentUser.is_system_role === true;
    if (!isMaster && action.tenantId !== currentUser.tenantId) {
      return NextResponse.json({ error: 'Esta ação não pertence ao seu tenant' }, { status: 403 });
    }

    if (action.status !== 'PENDING_APPROVAL') {
      return NextResponse.json({ error: `Status "${action.status}" não permite esta operação` }, { status: 409 });
    }

    if (body.decision === 'reject') {
      await prisma.$executeRaw`
        UPDATE campanhasmarketingdigital."AgentAction"
        SET status = 'REJECTED', "executedAt" = now() WHERE id = ${body.id}`;
      return NextResponse.json({ ok: true, status: 'REJECTED' });
    }

    // approve
    await prisma.$executeRaw`
      UPDATE campanhasmarketingdigital."AgentAction" SET status = 'PENDING_EXECUTION' WHERE id = ${body.id}`;

    try {
      await executeAction(action, action.tenantId ?? null, false, false, body.customBudget);

      // §8.4/H15 — circuit breaker pode ter bloqueado a execução mesmo com PIN/aprovação
      // válidos (REALLOCATE_BUDGET com ≥3 BACKFIRED recentes) — checar o status real gravado
      // em vez de assumir 'EXECUTED' só porque não lançou exceção.
      const afterRows = await prisma.$queryRaw<{ status: string }[]>`
        SELECT status FROM campanhasmarketingdigital."AgentAction" WHERE id = ${body.id} LIMIT 1`;
      if (afterRows[0]?.status === 'BLOCKED') {
        return NextResponse.json({ ok: true, status: 'BLOCKED', reason: 'circuit_breaker' });
      }

      return NextResponse.json({ ok: true, status: 'EXECUTED' });
    } catch (execErr: any) {
      await prisma.$executeRaw`
        UPDATE campanhasmarketingdigital."AgentAction" SET status = 'PENDING_APPROVAL' WHERE id = ${body.id}`;
      return NextResponse.json({ error: `Execução falhou: ${execErr.message}` }, { status: 502 });
    }
  } catch (err: any) {
    console.error('[aprovacoes POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

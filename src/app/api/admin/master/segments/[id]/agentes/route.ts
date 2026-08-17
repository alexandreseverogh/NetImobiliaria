/**
 * Config dos Agentes de Aceleração do CRM, por segmento (docs/PLANO_AGENTES_ACELERACAO_CRM.md
 * §5 — F0). Mesmo padrão de qualification-rules/route.ts: Master cura o default do segmento,
 * tenant pode sobrepor em crm_agentes_config_tenant (fora de escopo desta rota).
 *
 * GET /api/admin/master/segments/[id]/agentes
 *   → { catalog: [{key,label,description}], config: [{agent_key, ativo, params}] }
 *     catalog vem de CRM_AGENT_CATALOG (código) — cresce 1 entrada por fase (F1-F5).
 *
 * PUT /api/admin/master/segments/[id]/agentes
 *   → upsert de {agent_key, ativo, params} — SÓ aceita agent_key que já exista no catálogo
 *     (nenhum toggle "de mentira" pra agente ainda não implementado).
 *     Body: { agents: [{agent_key, ativo, params}] }
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';
import { CRM_AGENT_CATALOG } from '@/lib/crm/agents';

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
    const segRes = await pool.query(`SELECT id FROM public.system_segments WHERE id = $1::uuid LIMIT 1`, [params.id]);
    if (segRes.rows.length === 0) {
      return NextResponse.json({ error: 'Segmento não encontrado' }, { status: 404 });
    }
    const configRes = await pool.query(
      `SELECT agent_key, ativo, params
         FROM public.crm_agentes_config_segmento
        WHERE segment_id = $1::uuid`,
      [params.id],
    );
    return NextResponse.json({ catalog: CRM_AGENT_CATALOG, config: configRes.rows });
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
    const agents = Array.isArray(body?.agents) ? body.agents : [];
    const validKeys = new Set(CRM_AGENT_CATALOG.map(a => a.key));

    for (const a of agents) {
      if (!validKeys.has(a?.agent_key)) {
        return NextResponse.json({ error: `Agente "${a?.agent_key}" não existe no catálogo (ainda não implementado)` }, { status: 400 });
      }
    }

    const segRes = await client.query(`SELECT id FROM public.system_segments WHERE id = $1::uuid LIMIT 1`, [params.id]);
    if (segRes.rows.length === 0) {
      return NextResponse.json({ error: 'Segmento não encontrado' }, { status: 404 });
    }

    await client.query('BEGIN');
    for (const a of agents) {
      await client.query(
        `INSERT INTO public.crm_agentes_config_segmento (segment_id, agent_key, ativo, params, updated_at)
         VALUES ($1::uuid, $2, $3, $4::jsonb, now())
         ON CONFLICT (segment_id, agent_key)
         DO UPDATE SET ativo = EXCLUDED.ativo, params = EXCLUDED.params, updated_at = now()`,
        [params.id, a.agent_key, a.ativo === true, JSON.stringify(a.params ?? {})],
      );
    }
    await client.query('COMMIT');

    return NextResponse.json({ ok: true, updated: agents.length });
  } catch (err: any) {
    await client.query('ROLLBACK');
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}

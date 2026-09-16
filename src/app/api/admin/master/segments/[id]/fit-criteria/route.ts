/**
 * Critérios de Fit (ICP) padrão por segmento (docs/PLANO_AGENTES_ACELERACAO_CRM.md §3.1 — F0.5).
 *
 * GET /api/admin/master/segments/[id]/fit-criteria
 *   → { criteria: [{id, criterio, peso, ordem, ativo}] }
 *
 * PUT /api/admin/master/segments/[id]/fit-criteria
 *   → salva os critérios (replace-all transacional).
 *     Body: { criteria: [{criterio, peso, ativo}] }
 *
 * Consumido por src/lib/ai/conciergeService.ts (mesma chamada de LLM que já resolve
 * score_prontidao, agora também resolve score_fit) e por src/app/crm/config/ia/page.tsx
 * (leitura pelo tenant).
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';
import type { PoolClient } from 'pg';

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
    const segRes = await pool.query(
      `SELECT id, next_best_action_captacao_fit_minimo FROM public.system_segments WHERE id = $1::uuid LIMIT 1`,
      [params.id],
    );
    if (segRes.rows.length === 0) {
      return NextResponse.json({ error: 'Segmento não encontrado' }, { status: 404 });
    }
    const { rows } = await pool.query(
      `SELECT id, criterio, peso, ordem, ativo
         FROM public.crm_fit_criterios_segmento
        WHERE segment_id = $1::uuid
        ORDER BY ordem ASC`,
      [params.id],
    );
    return NextResponse.json({
      criteria: rows,
      captacaoFitMinimo: segRes.rows[0].next_best_action_captacao_fit_minimo,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireMaster(request))) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 });
  }
  let client: PoolClient | null = null;
  try {
    const body = await request.json();
    const criteria = Array.isArray(body?.criteria) ? body.criteria : [];

    for (const c of criteria) {
      if (!c?.criterio?.trim()) {
        return NextResponse.json({ error: 'Cada critério precisa de uma descrição.' }, { status: 400 });
      }
    }

    // Aderência mínima pra disparo automático na captação — null desativa (nunca dispara
    // sem valor explícito). Campo ausente no body preserva o valor já salvo (não confunde
    // "não mandou" com "quer desativar").
    const hasCaptacaoFitMinimo = Object.prototype.hasOwnProperty.call(body ?? {}, 'captacaoFitMinimo');
    let captacaoFitMinimo: number | null | undefined = undefined;
    if (hasCaptacaoFitMinimo) {
      const raw = body.captacaoFitMinimo;
      if (raw === null || raw === '') {
        captacaoFitMinimo = null;
      } else {
        const n = Number(raw);
        if (!Number.isFinite(n) || n < 0 || n > 100) {
          return NextResponse.json({ error: 'Aderência mínima de captação precisa ser um número entre 0 e 100 (ou vazio).' }, { status: 400 });
        }
        captacaoFitMinimo = Math.round(n);
      }
    }

    // Achado no caminho, corrigido de brinde: as 2 validações acima (nunca uma conexão
    // aberta cedo demais — client só é adquirido depois de tudo validado, sem risco de
    // vazar conexão do pool num early-return).
    client = await pool.connect();
    await client.query('BEGIN');

    const segRes = await client.query(`SELECT id FROM public.system_segments WHERE id = $1::uuid LIMIT 1`, [params.id]);
    if (segRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Segmento não encontrado' }, { status: 404 });
    }

    if (hasCaptacaoFitMinimo) {
      await client.query(
        `UPDATE public.system_segments SET next_best_action_captacao_fit_minimo = $1 WHERE id = $2::uuid`,
        [captacaoFitMinimo, params.id],
      );
    }

    await client.query(`DELETE FROM public.crm_fit_criterios_segmento WHERE segment_id = $1::uuid`, [params.id]);

    let inserted = 0;
    for (let i = 0; i < criteria.length; i++) {
      const c = criteria[i];
      await client.query(
        `INSERT INTO public.crm_fit_criterios_segmento (segment_id, criterio, peso, ordem, ativo)
         VALUES ($1::uuid, $2, $3, $4, $5)`,
        [
          params.id,
          c.criterio.trim(),
          Math.min(10, Math.max(0, Number(c.peso) || 5)),
          i,
          c.ativo !== false,
        ],
      );
      inserted++;
    }

    await client.query('COMMIT');
    return NextResponse.json({ ok: true, inserted });
  } catch (err: any) {
    if (client) await client.query('ROLLBACK');
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    client?.release();
  }
}

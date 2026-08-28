/**
 * Default de LLM do Master POR SEGMENTO (docs/CHECKPOINT.md, 2026-08-28 — cascata
 * Cliente → Tenant → Segmento → Global, só CRM/Mensageria). Fica em
 * campanhasmarketingdigital."Settings" com tenant_id IS NULL AND segment_id = X — a linha
 * global de sempre (tenant_id IS NULL AND segment_id IS NULL) continua sendo o fallback
 * final quando um segmento ainda não tem default próprio configurado.
 *
 * GET  → { llmProvider, llmModel, llmApiKeySet, llmApiKeyMasked } — nunca devolve a chave crua.
 * PUT  → upsert da linha; { llmProvider?, llmModel?, llmApiKey? } — chave ausente/vazia
 *        preserva a já salva (nunca apaga sem intenção explícita).
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';

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

    const res = await pool.query(
      `SELECT "llmProvider", "llmModel", "llmApiKey"
       FROM campanhasmarketingdigital."Settings"
       WHERE tenant_id IS NULL AND segment_id = $1::uuid LIMIT 1`,
      [params.id],
    );
    const s = res.rows[0] || null;
    const apiKey = s?.llmApiKey || '';
    return NextResponse.json({
      llmProvider: s?.llmProvider || null,
      llmModel: s?.llmModel || null,
      llmApiKeySet: !!apiKey,
      llmApiKeyMasked: apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : '',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await requireMaster(request))) {
    return NextResponse.json({ error: 'Acesso Master requerido' }, { status: 403 });
  }
  try {
    const segRes = await pool.query(`SELECT id FROM public.system_segments WHERE id = $1::uuid LIMIT 1`, [params.id]);
    if (segRes.rows.length === 0) {
      return NextResponse.json({ error: 'Segmento não encontrado' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { llmProvider, llmModel, llmApiKey } = body ?? {};
    if (llmProvider === undefined && llmModel === undefined && llmApiKey === undefined) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
    }

    // UPSERT — mesmo idioma já usado em /api/admin/campanhas/settings/llm (COALESCE preserva
    // o que já estava salvo quando o campo não veio no body, nunca apaga sem intenção).
    await pool.query(
      `INSERT INTO campanhasmarketingdigital."Settings" (id, tenant_id, client_id, segment_id, "llmProvider", "llmModel", "llmApiKey")
       VALUES (gen_random_uuid(), NULL, NULL, $1::uuid, $2, $3, $4)
       ON CONFLICT (segment_id) WHERE tenant_id IS NULL AND segment_id IS NOT NULL DO UPDATE SET
         "llmProvider" = COALESCE(EXCLUDED."llmProvider", campanhasmarketingdigital."Settings"."llmProvider"),
         "llmModel"    = COALESCE(EXCLUDED."llmModel",    campanhasmarketingdigital."Settings"."llmModel"),
         "llmApiKey"   = COALESCE(EXCLUDED."llmApiKey",   campanhasmarketingdigital."Settings"."llmApiKey")`,
      [params.id, llmProvider ?? null, llmModel ?? null, llmApiKey ?? null],
    );

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

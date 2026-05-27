import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

export const dynamic = 'force-dynamic';

// GET /api/admin/campanhas/settings/llm
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const res = await pool.query(
      `SELECT "llmProvider", "llmModel", "llmApiKey"
       FROM campanhasmarketingdigital."Settings"
       WHERE tenant_id = $1::uuid LIMIT 1`,
      [payload.tenantId]
    );
    const s = res.rows[0] || null;
    const apiKey = s?.llmApiKey || '';

    return NextResponse.json({
      llmProvider:     s?.llmProvider || 'anthropic',
      llmModel:        s?.llmModel    || 'claude-sonnet-4-6',
      llmApiKeySet:    !!apiKey,
      llmApiKeyMasked: apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : '',
    });
  } catch (error: any) {
    console.error('GET /settings/llm error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao buscar configurações LLM' }, { status: 500 });
  }
}

// PUT /api/admin/campanhas/settings/llm
export async function PUT(request: NextRequest) {
  try {
    // Verificar permissão de edição server-side
    const denied = await requireApiPermission(request, 'campanhasmarketingdigital', 'UPDATE');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { llmProvider, llmModel, llmApiKey } = body;

    if (llmProvider === undefined && llmModel === undefined && llmApiKey === undefined) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
    }

    // UPSERT via SQL
    await pool.query(
      `INSERT INTO campanhasmarketingdigital."Settings" (id, tenant_id, "llmProvider", "llmModel", "llmApiKey")
       VALUES (gen_random_uuid(), $1::uuid, $2, $3, $4)
       ON CONFLICT (tenant_id) DO UPDATE SET
         "llmProvider" = COALESCE(EXCLUDED."llmProvider", campanhasmarketingdigital."Settings"."llmProvider"),
         "llmModel"    = COALESCE(EXCLUDED."llmModel",    campanhasmarketingdigital."Settings"."llmModel"),
         "llmApiKey"   = COALESCE(EXCLUDED."llmApiKey",   campanhasmarketingdigital."Settings"."llmApiKey")`,
      [
        payload.tenantId,
        llmProvider ?? null,
        llmModel    ?? null,
        llmApiKey   ?? null,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PUT /settings/llm error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao salvar configurações LLM' }, { status: 500 });
  }
}

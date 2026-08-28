import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

export const dynamic = 'force-dynamic';

/**
 * Modelo de LLM do tenant — GET/PUT sem clientId (comportamento de sempre). Com `clientId`
 * (query no GET, body no PUT), lê/grava o override daquele CLIENTE específico (nível mais
 * específico da cascata Cliente → Tenant → Segmento → Global, docs/CHECKPOINT.md 2026-08-28)
 * — sempre cadastrado pelo admin do TENANT em nome do cliente, já que cliente nunca loga na
 * aplicação. Só CRM/Mensageria consomem essa cascata (getLlmClient) — Campanhas de Marketing
 * Digital usa getLlmClientForCampaigns, sempre global, nunca lê esta tabela por clientId.
 */

// GET /api/admin/campanhas/settings/llm?clientId=<uuid opcional>
export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const clientId = new URL(request.url).searchParams.get('clientId') || null;

    const res = clientId
      ? await pool.query(
          `SELECT "llmProvider", "llmModel", "llmApiKey"
           FROM campanhasmarketingdigital."Settings"
           WHERE tenant_id = $1::uuid AND client_id = $2::uuid LIMIT 1`,
          [payload.tenantId, clientId]
        )
      : await pool.query(
          `SELECT "llmProvider", "llmModel", "llmApiKey"
           FROM campanhasmarketingdigital."Settings"
           WHERE tenant_id = $1::uuid AND client_id IS NULL LIMIT 1`,
          [payload.tenantId]
        );
    const s = res.rows[0] || null;
    const apiKey = s?.llmApiKey || '';

    return NextResponse.json({
      // Sem override no nível do cliente, não inventa um padrão "claude-sonnet" — deixa a UI
      // mostrar explicitamente "herdando do tenant/segmento/global" (diferente do próprio
      // tenant, que sempre tem um valor efetivo mostrado, mesmo que seja só o default de código).
      llmProvider:     s?.llmProvider || (clientId ? null : 'anthropic'),
      llmModel:        s?.llmModel    || (clientId ? null : 'claude-sonnet-4-6'),
      llmApiKeySet:    !!apiKey,
      llmApiKeyMasked: apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : '',
    });
  } catch (error: any) {
    console.error('GET /settings/llm error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao buscar configurações LLM' }, { status: 500 });
  }
}

// PUT /api/admin/campanhas/settings/llm — body: { llmProvider?, llmModel?, llmApiKey?, clientId? }
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
    const { llmProvider, llmModel, llmApiKey, clientId } = body;

    if (llmProvider === undefined && llmModel === undefined && llmApiKey === undefined) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 });
    }

    // UPSERT via SQL — conflict target aponta pro índice único PARCIAL certo conforme o
    // nível (linha do próprio tenant vs. linha de um cliente específico dele).
    if (clientId) {
      await pool.query(
        `INSERT INTO campanhasmarketingdigital."Settings" (id, tenant_id, client_id, "llmProvider", "llmModel", "llmApiKey")
         VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3, $4, $5)
         ON CONFLICT (tenant_id, client_id) WHERE client_id IS NOT NULL DO UPDATE SET
           "llmProvider" = COALESCE(EXCLUDED."llmProvider", campanhasmarketingdigital."Settings"."llmProvider"),
           "llmModel"    = COALESCE(EXCLUDED."llmModel",    campanhasmarketingdigital."Settings"."llmModel"),
           "llmApiKey"   = COALESCE(EXCLUDED."llmApiKey",   campanhasmarketingdigital."Settings"."llmApiKey")`,
        [payload.tenantId, clientId, llmProvider ?? null, llmModel ?? null, llmApiKey ?? null]
      );
    } else {
      await pool.query(
        `INSERT INTO campanhasmarketingdigital."Settings" (id, tenant_id, client_id, "llmProvider", "llmModel", "llmApiKey")
         VALUES (gen_random_uuid(), $1::uuid, NULL, $2, $3, $4)
         ON CONFLICT (tenant_id) WHERE tenant_id IS NOT NULL AND client_id IS NULL DO UPDATE SET
           "llmProvider" = COALESCE(EXCLUDED."llmProvider", campanhasmarketingdigital."Settings"."llmProvider"),
           "llmModel"    = COALESCE(EXCLUDED."llmModel",    campanhasmarketingdigital."Settings"."llmModel"),
           "llmApiKey"   = COALESCE(EXCLUDED."llmApiKey",   campanhasmarketingdigital."Settings"."llmApiKey")`,
        [payload.tenantId, llmProvider ?? null, llmModel ?? null, llmApiKey ?? null]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('PUT /settings/llm error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao salvar configurações LLM' }, { status: 500 });
  }
}

// DELETE /api/admin/campanhas/settings/llm?clientId=<uuid> — restaura a herança da cascata
// pra este cliente (apaga só a linha de override dele, nunca a do tenant).
export async function DELETE(request: NextRequest) {
  try {
    const denied = await requireApiPermission(request, 'campanhasmarketingdigital', 'UPDATE');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload?.tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    const clientId = new URL(request.url).searchParams.get('clientId');
    if (!clientId) {
      return NextResponse.json({ error: 'clientId é obrigatório — este endpoint nunca apaga a config do próprio tenant.' }, { status: 400 });
    }

    await pool.query(
      `DELETE FROM campanhasmarketingdigital."Settings" WHERE tenant_id = $1::uuid AND client_id = $2::uuid`,
      [payload.tenantId, clientId]
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE /settings/llm error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao restaurar configurações LLM' }, { status: 500 });
  }
}

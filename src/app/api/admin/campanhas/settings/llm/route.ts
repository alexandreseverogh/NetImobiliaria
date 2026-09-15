import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireAnyApiPermission } from '@/lib/auth/apiPermissions';
import { resolveSegment } from '@/lib/intelligence/segmentResolver';

// Endpoint genuinamente compartilhado (docs/CHECKPOINT.md, 2026-09-01) — mesmo mora sob
// /api/admin/campanhas/* por herança de onde a tela original vivia, quem de fato consome a
// cascata (getLlmClient) é CRM e Mensageria; Campanhas usa getLlmClientForCampaigns, sempre
// global, nunca chama esta rota por clientId. Qualquer um dos 3 resources abaixo já prova que
// o tenant chegou aqui por um caminho legítimo (/crm/config/ia, /mensageria/config, ou —
// mantido por retrocompatibilidade — /admin/campanhas/configuracoes).
const LLM_SETTINGS_RESOURCES = ['crm-settings', 'mensageria-config', 'configuracoes-campanhas'];

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

    // Nível cliente: comportamento de sempre — sem override próprio, devolve null explícito,
    // a UI mostra honestamente "herda a cascata" (nunca finge um valor específico aqui).
    if (clientId) {
      const apiKey = s?.llmApiKey || '';
      return NextResponse.json({
        llmProvider:     s?.llmProvider || null,
        llmModel:        s?.llmModel    || null,
        llmApiKeySet:    !!apiKey,
        llmApiKeyMasked: apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : '',
      });
    }

    // Nível tenant: quando o próprio tenant não tem override, o "modelo efetivo" mostrado aqui
    // precisa refletir a MESMA cascata que getLlmClient() de fato usa em runtime (Segmento →
    // Global → default de código) — nunca um literal hardcoded desconectado da realidade
    // (achado real, roteiro de testes CRM 2026-09-11: essa rota sempre devolvia "anthropic/
    // claude-sonnet-4-6" mesmo com um default de segmento real e válido já configurado).
    let effective = s;
    let isTenantOverride = !!s;
    let inheritedFrom: 'segment' | 'global' | 'default' | null = null;
    if (!effective) {
      try {
        const segment = await resolveSegment(payload.tenantId, null);
        if (segment?.id) {
          const segRes = await pool.query(
            `SELECT "llmProvider", "llmModel", "llmApiKey"
             FROM campanhasmarketingdigital."Settings"
             WHERE tenant_id IS NULL AND segment_id = $1::uuid LIMIT 1`,
            [segment.id]
          );
          if (segRes.rows[0]) { effective = segRes.rows[0]; inheritedFrom = 'segment'; }
        }
      } catch { /* segmento não resolvido — segue pro fallback global de sempre */ }
    }
    if (!effective) {
      const globalRes = await pool.query(
        `SELECT "llmProvider", "llmModel", "llmApiKey"
         FROM campanhasmarketingdigital."Settings"
         WHERE tenant_id IS NULL AND segment_id IS NULL LIMIT 1`
      );
      if (globalRes.rows[0]) { effective = globalRes.rows[0]; inheritedFrom = 'global'; }
    }
    if (!effective) inheritedFrom = 'default';

    const apiKey = effective?.llmApiKey || '';
    return NextResponse.json({
      llmProvider:      effective?.llmProvider || 'anthropic',
      llmModel:         effective?.llmModel    || 'claude-sonnet-4-5',
      llmApiKeySet:     !!apiKey,
      llmApiKeyMasked:  apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : '',
      isTenantOverride,
      inheritedFrom,
    });
  } catch (error: any) {
    console.error('GET /settings/llm error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao buscar configurações LLM' }, { status: 500 });
  }
}

// PUT /api/admin/campanhas/settings/llm — body: { llmProvider?, llmModel?, llmApiKey?, clientId? }
export async function PUT(request: NextRequest) {
  try {
    const denied = await requireAnyApiPermission(request, LLM_SETTINGS_RESOURCES, 'UPDATE');
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
    const denied = await requireAnyApiPermission(request, LLM_SETTINGS_RESOURCES, 'UPDATE');
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

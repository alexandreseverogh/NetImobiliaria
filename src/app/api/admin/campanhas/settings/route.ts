import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { getTokenPayload } from '@/lib/auth/jwt-node';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

export const dynamic = 'force-dynamic';

// Helper: busca Settings por tenant_id via SQL direto (schema campanhasmarketingdigital)
async function getSettingsByTenant(tenantId: string) {
  const res = await pool.query(
    `SELECT id, tenant_id, "llmProvider", "llmModel", "llmApiKey", "creativesPath", "publicDomain"
     FROM campanhasmarketingdigital."Settings"
     WHERE tenant_id = $1::uuid LIMIT 1`,
    [tenantId]
  );
  return res.rows[0] || null;
}

export async function GET(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload || !payload.tenantId) {
      return NextResponse.json({ error: 'Tenant não encontrado ou usuário não autenticado' }, { status: 401 });
    }

    // Buscar tenant principal
    const tenantRes = await pool.query(
      `SELECT id, name, trafego_tier, meta_app_id, meta_app_secret, meta_ad_account_id, meta_token_expires_at, meta_token,
              anthropic_api_key, slack_webhook_url, evolution_api_url, evolution_api_key, evolution_instance, agent_confidence_threshold
       FROM public.tenants
       WHERE id = $1::uuid LIMIT 1`,
      [payload.tenantId]
    );

    if (tenantRes.rows.length === 0) {
      return NextResponse.json({ error: 'Tenant não encontrado' }, { status: 404 });
    }

    const tenant = tenantRes.rows[0];

    // Configurações per-tenant (LLM, criativos)
    const settings = await getSettingsByTenant(payload.tenantId);

    return NextResponse.json({
      isMaster:           !!payload.is_system_role,
      tenantId:           tenant.id,
      tenantName:         tenant.name,
      trafegoTier:        tenant.trafego_tier,
      metaAppId:          tenant.meta_app_id,
      metaAppSecret:      tenant.meta_app_secret,
      adAccountId:        tenant.meta_ad_account_id,
      metaTokenExpiresAt: tenant.meta_token_expires_at,
      metaTokenSet:       !!tenant.meta_token,
      metaToken:          tenant.meta_token || '',
      llmProvider:        settings?.llmProvider || 'anthropic',
      llmModel:           settings?.llmModel    || 'claude-sonnet-4-6',
      creativesPath:      settings?.creativesPath,
      publicDomain:       settings?.publicDomain,
      anthropicApiKey:    tenant.anthropic_api_key,
      slackWebhookUrl:    tenant.slack_webhook_url,
      evolutionApiUrl:    tenant.evolution_api_url,
      evolutionApiKey:    tenant.evolution_api_key,
      evolutionInstance:  tenant.evolution_instance,
      agentConfidenceThreshold: tenant.agent_confidence_threshold !== null ? parseFloat(tenant.agent_confidence_threshold) : 0.85,
    });
  } catch (error: any) {
    console.error('Erro no GET /settings:', error);
    return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const payload = getTokenPayload(request);
    if (!payload || !payload.tenantId) {
      return NextResponse.json({ error: 'Tenant não encontrado ou usuário não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      metaAppId, metaAppSecret, metaToken, adAccountId, creativesPath, publicDomain,
      anthropicApiKey, slackWebhookUrl, evolutionApiUrl, evolutionApiKey, evolutionInstance, agentConfidenceThreshold 
    } = body;

    // Campos Meta API exigem permissão UPDATE; creativesPath/publicDomain são do próprio tenant
    const hasMeta = metaAppId !== undefined || metaAppSecret !== undefined
                 || metaToken !== undefined || adAccountId !== undefined;
    if (hasMeta) {
      const denied = await requireApiPermission(request, 'campanhasmarketingdigital', 'UPDATE');
      if (denied) return denied;
    }

    // Atualiza campos no tenant (schema public)
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    if (metaAppId !== undefined)            { sets.push(`meta_app_id = $${idx++}`);              vals.push(metaAppId); }
    if (metaAppSecret !== undefined)        { sets.push(`meta_app_secret = $${idx++}`);          vals.push(metaAppSecret); }
    if (metaToken !== undefined) {
      sets.push(`meta_token = $${idx++}`);           vals.push(metaToken);
      sets.push(`meta_token_expires_at = $${idx++}`); vals.push(new Date(Date.now() + 60 * 86400 * 1000));
    }
    if (adAccountId !== undefined)           { sets.push(`meta_ad_account_id = $${idx++}`);        vals.push(adAccountId); }
    if (anthropicApiKey !== undefined)       { sets.push(`anthropic_api_key = $${idx++}`);        vals.push(anthropicApiKey); }
    if (slackWebhookUrl !== undefined)       { sets.push(`slack_webhook_url = $${idx++}`);        vals.push(slackWebhookUrl); }
    if (evolutionApiUrl !== undefined)       { sets.push(`evolution_api_url = $${idx++}`);        vals.push(evolutionApiUrl); }
    if (evolutionApiKey !== undefined)       { sets.push(`evolution_api_key = $${idx++}`);        vals.push(evolutionApiKey); }
    if (evolutionInstance !== undefined)     { sets.push(`evolution_instance = $${idx++}`);       vals.push(evolutionInstance); }
    if (agentConfidenceThreshold !== undefined) {
      sets.push(`agent_confidence_threshold = $${idx++}`);
      vals.push(agentConfidenceThreshold !== null ? parseFloat(agentConfidenceThreshold) : null);
    }

    if (sets.length > 0) {
      vals.push(payload.tenantId);
      await pool.query(
        `UPDATE public.tenants SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${idx}::uuid`,
        vals
      );
    }

    // Atualiza Settings per-tenant (schema campanhasmarketingdigital) via UPSERT SQL
    if (creativesPath !== undefined || publicDomain !== undefined) {
      await pool.query(
        `INSERT INTO campanhasmarketingdigital."Settings" (id, tenant_id, "creativesPath", "publicDomain", "llmProvider", "llmModel")
         VALUES (gen_random_uuid(), $1::uuid, $2, $3, 'anthropic', 'claude-sonnet-4-6')
         ON CONFLICT (tenant_id) DO UPDATE SET
           "creativesPath" = COALESCE(EXCLUDED."creativesPath", campanhasmarketingdigital."Settings"."creativesPath"),
           "publicDomain"  = COALESCE(EXCLUDED."publicDomain",  campanhasmarketingdigital."Settings"."publicDomain")`,
        [payload.tenantId, creativesPath ?? null, publicDomain ?? null]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro no PUT /settings:', error);
    return NextResponse.json({ error: 'Erro ao salvar configurações' }, { status: 500 });
  }
}

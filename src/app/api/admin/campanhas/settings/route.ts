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
      `SELECT id, name, trafego_tier, meta_app_id, meta_app_secret, meta_ad_account_id, meta_token_expires_at, meta_token
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
      tenantId:           tenant.id,
      tenantName:         tenant.name,
      trafegoTier:        tenant.trafego_tier,
      metaAppId:          tenant.meta_app_id,
      metaAppSecret:      tenant.meta_app_secret,
      adAccountId:        tenant.meta_ad_account_id,
      metaTokenExpiresAt: tenant.meta_token_expires_at,
      metaTokenSet:       !!tenant.meta_token,
      llmProvider:        settings?.llmProvider || 'anthropic',
      llmModel:           settings?.llmModel    || 'claude-sonnet-4-6',
      creativesPath:      settings?.creativesPath,
      publicDomain:       settings?.publicDomain,
    });
  } catch (error: any) {
    console.error('Erro no GET /settings:', error);
    return NextResponse.json({ error: 'Erro ao buscar configurações' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verificar permissão de edição server-side
    const denied = await requireApiPermission(request, 'campanhasmarketingdigital', 'UPDATE');
    if (denied) return denied;

    const payload = getTokenPayload(request);
    if (!payload || !payload.tenantId) {
      return NextResponse.json({ error: 'Tenant não encontrado ou usuário não autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { metaAppId, metaAppSecret, metaToken, adAccountId, creativesPath, publicDomain } = body;

    // Atualiza campos Meta no tenant (schema public)
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    if (metaAppId !== undefined)     { sets.push(`meta_app_id = $${idx++}`);      vals.push(metaAppId); }
    if (metaAppSecret !== undefined)  { sets.push(`meta_app_secret = $${idx++}`);  vals.push(metaAppSecret); }
    if (metaToken !== undefined) {
      sets.push(`meta_token = $${idx++}`);           vals.push(metaToken);
      sets.push(`meta_token_expires_at = $${idx++}`); vals.push(new Date(Date.now() + 60 * 86400 * 1000));
    }
    if (adAccountId !== undefined)    { sets.push(`meta_ad_account_id = $${idx++}`); vals.push(adAccountId); }

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

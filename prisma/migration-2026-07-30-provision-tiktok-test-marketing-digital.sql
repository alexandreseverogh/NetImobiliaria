-- Provisiona a rede TikTok Ads (contratação) pro tenant Marketing Digital + conecta uma
-- credencial sentinela de teste (__SIMULATED__, mesmo padrão da Trilha E/T3 desta sessão —
-- ativa o FakeTikTokAdapter em src/lib/marketing/networks/factory.ts, nunca uma credencial
-- real). Pedido explícito do usuário pra destravar o botão "TikTok Ads" em
-- /admin/campanhas/nova pra fins de teste. Aditivo/idempotente.

INSERT INTO public.tenant_feature_overrides (tenant_id, feature_id, is_active)
SELECT t.id, f.id, true
FROM public.tenants t, public.system_features f
WHERE t.id = 'efbf62cf-9e28-4b31-a4f6-82a037412353'
  AND f.slug = 'campanhas-rede-tiktok'
ON CONFLICT (tenant_id, feature_id) DO UPDATE SET is_active = true;

INSERT INTO public.tenant_network_credentials (tenant_id, network_id, credentials, display_name, is_active)
SELECT 'efbf62cf-9e28-4b31-a4f6-82a037412353'::uuid, an.id,
       '{"access_token": "__SIMULATED__"}'::jsonb,
       'TikTok Ads (teste/simulado)', true
FROM public.ad_networks an
WHERE an.code = 'tiktok'
ON CONFLICT (tenant_id, network_id) DO UPDATE
  SET credentials = EXCLUDED.credentials, is_active = true, display_name = EXCLUDED.display_name;

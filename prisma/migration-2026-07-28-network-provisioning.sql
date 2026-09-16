-- Provisionamento por rede de anúncio (Meta/Google/TikTok) — modelo de negócio: cada rede é
-- cobrada separadamente por tenant. Reaproveita o sistema genérico de features já usado por
-- todo o resto da plataforma (system_features + tenant_feature_overrides + Master
-- /admin/master/provisioning), em vez de colunas soltas em `tenants` — decisão discutida com o
-- usuário em 2026-07-28 (ver CHECKPOINT.md): evita um 2º mecanismo paralelo de "esta empresa
-- tem acesso a X ou não" quando já existe um genérico, testado, com UI de Master pronta.

INSERT INTO public.system_features
  (name, slug, description, category_id, url, is_active, sort_order, icon)
SELECT * FROM (VALUES
  ('Rede Meta Ads',   'campanhas-rede-meta',   'Habilita a rede Meta Ads como opção de lançamento de campanha', 30, NULL::varchar, true, 10, 'lucide-Facebook'),
  ('Rede Google Ads', 'campanhas-rede-google', 'Habilita a rede Google Ads (Performance Max) como opção de lançamento de campanha', 30, NULL::varchar, true, 11, 'lucide-Chrome'),
  ('Rede TikTok Ads', 'campanhas-rede-tiktok', 'Habilita a rede TikTok Ads como opção de lançamento de campanha', 30, NULL::varchar, true, 12, 'lucide-Music2')
) AS v(name, slug, description, category_id, url, is_active, sort_order, icon)
WHERE NOT EXISTS (SELECT 1 FROM public.system_features WHERE slug = v.slug);

-- Vincula ao módulo "Gestão de Campanhas de Marketing Digital" (trafego-pago, id fixo já
-- confirmado no banco) — sem isso o Master nunca veria essas 3 features na tela de
-- provisionamento (ficariam "orphan features", regra crítica documentada em
-- docs/ACCESS_CONTROL.md). Não têm url própria de propósito — não são uma página/rota, são um
-- toggle de capacidade dentro da tela "Configurações → Redes" já existente.
INSERT INTO public.system_feature_modules (feature_id, module_id)
SELECT f.id, '437c2d73-230e-4bfb-93f6-91badd103c8e'::uuid
FROM public.system_features f
WHERE f.slug IN ('campanhas-rede-meta', 'campanhas-rede-google', 'campanhas-rede-tiktok')
  AND NOT EXISTS (
    SELECT 1 FROM public.system_feature_modules fm
    WHERE fm.feature_id = f.id AND fm.module_id = '437c2d73-230e-4bfb-93f6-91badd103c8e'::uuid
  );

-- Backfill deliberado (não é provisionamento automático genérico — provisionar tenants NOVOS
-- continua 100% manual via Master): tenants que JÁ têm credencial ativa configurada pra uma
-- rede continuam podendo usá-la, preservando o que já funcionava antes deste gate existir.
INSERT INTO public.tenant_feature_overrides (tenant_id, feature_id, is_active)
SELECT DISTINCT tnc.tenant_id, f.id, true
FROM public.tenant_network_credentials tnc
JOIN public.ad_networks an ON an.id = tnc.network_id
JOIN public.system_features f ON f.slug = 'campanhas-rede-' || an.code
WHERE tnc.is_active = true
  AND an.code IN ('meta', 'google', 'tiktok')
ON CONFLICT (tenant_id, feature_id) DO NOTHING;

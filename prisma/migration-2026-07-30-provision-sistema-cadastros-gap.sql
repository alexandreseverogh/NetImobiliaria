-- Corrige lacuna real de provisionamento encontrada testando a sidebar da tenant
-- admmd (Marketing Digital): 7 features da categoria "Sistema" (ferramentas
-- básicas de auditoria/segurança, não específicas de plano comercial) e
-- "Proprietários" (categoria Cadastros) já estavam provisionadas pra
-- "Imobiliaria XYZ" (e, no caso de Proprietários, também pra "Imovitec"), mas
-- nunca foram provisionadas pras outras empresas reais — não é bug de código
-- na função get_sidebar_menu_for_user, é dado de tenant_feature_overrides faltando.
-- Aditivo/idempotente (ON CONFLICT), reversível via /admin/master/provisioning.

-- Categoria "Sistema" — features 32,33,37,39,40,41,63 — faltando em
-- Marketing Digital e Imovitec (já provisionadas só em Imobiliaria XYZ).
INSERT INTO public.tenant_feature_overrides (tenant_id, feature_id, is_active)
SELECT t.id, f.feature_id, true
FROM public.tenants t
CROSS JOIN (VALUES (32), (33), (37), (39), (40), (41), (63)) AS f(feature_id)
WHERE t.name IN ('Marketing Digital', 'Imovitec')
ON CONFLICT (tenant_id, feature_id) DO UPDATE SET is_active = true;

-- Categoria "Cadastros" — feature 18 (Proprietários) — faltando só em
-- Marketing Digital (Imobiliaria XYZ e Imovitec já têm).
INSERT INTO public.tenant_feature_overrides (tenant_id, feature_id, is_active)
SELECT t.id, 18, true
FROM public.tenants t
WHERE t.name = 'Marketing Digital'
ON CONFLICT (tenant_id, feature_id) DO UPDATE SET is_active = true;

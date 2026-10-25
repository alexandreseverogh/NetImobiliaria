-- Migração: Importar Campanhas Existentes (campanha lançada direto no Meta, não pela aplicação)
-- Contexto: docs/CHECKPOINT.md — analisar resultado de campanha que não passou pelo nosso
-- wizard de lançamento. Flag "Importada — somente leitura" blinda a campanha das ações
-- automáticas do Agente Decisor (PAUSE/SCALE/etc.), mas ela continua sincronizando insights
-- e aparecendo normalmente em dashboards/CPL/funil.

-- 1. Coluna nova em Campaign (schema campanhasmarketingdigital)
ALTER TABLE campanhasmarketingdigital."Campaign"
  ADD COLUMN IF NOT EXISTS imported_read_only BOOLEAN NOT NULL DEFAULT false;

-- 2. Registro na sidebar (mesmo padrão real das outras features deste módulo,
--    categoria 30 = "Campanhas de Marketing Digital")
INSERT INTO public.system_features (name, slug, url, category_id, sort_order, is_active)
VALUES ('Importar Campanhas', 'campanhas-importar', '/admin/campanhas/importar', 30, 13, true)
ON CONFLICT (slug) DO NOTHING;

-- 3. Permissions — mesmo trio (read/create/execute) já usado por "Lançar Campanha" (feature 100)
INSERT INTO public.permissions (feature_id, action)
SELECT sf.id, action
FROM public.system_features sf
CROSS JOIN (VALUES ('read'), ('create'), ('execute')) AS actions(action)
WHERE sf.slug = 'campanhas-importar'
ON CONFLICT (feature_id, action) DO NOTHING;

-- 4. Provisionamento — mesmos 6 tenants que já têm "Lançar Campanha" (feature 100) ativo hoje
INSERT INTO public.tenant_feature_overrides (tenant_id, feature_id, is_active)
SELECT tfo.tenant_id, sf.id, true
FROM public.tenant_feature_overrides tfo
JOIN public.system_features sf ON sf.slug = 'campanhas-importar'
WHERE tfo.feature_id = 100 AND tfo.is_active = true
ON CONFLICT (tenant_id, feature_id) DO UPDATE SET is_active = true;

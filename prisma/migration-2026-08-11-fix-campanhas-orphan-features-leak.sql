-- Fix real: 4 features de Campanhas de Marketing Digital (Aprovações do Agente, Destinos de
-- CTA, Analytics de Captura, Mecanismos — ids 106/107/108/109) nunca foram linkadas ao módulo
-- "Gestão de Campanhas de Marketing Digital" (system_feature_modules), diferente de TODAS as
-- outras 14 irmãs da mesma categoria (92-104), que já são. Pior: as 4 estavam marcadas
-- is_default_tenant_admin_feature=true — flag que faz /api/admin/master/tenants seedar
-- automaticamente em TODO tenant novo, independente de módulo selecionado. Resultado real
-- (não hipotético, confirmado via SQL): TODO tenant da plataforma tinha essas 4 features em
-- tenant_feature_overrides, inclusive os sem Campanhas contratado — reportado pelo usuário
-- para o tenant de teste "CRM SOZINHO" (categoria "Campanhas de Marketing Digital" aparecendo
-- na sidebar sem nunca ter sido provisionada).
--
-- Achado relacionado, mesma investigação: system_feature_categorias tinha 1 mapeamento
-- explícito estranho — feature 6 ("Usuários", categoria padrão real "Permissões") forçada pra
-- categoria "Gestão Administrativa Imóveis" (resíduo legado de quando a plataforma era só
-- imobiliária) — fazia "Usuários" (legitimamente provisionada como feature padrão de todo
-- tenant admin) aparecer sob uma categoria de nome completamente fora de contexto pra qualquer
-- tenant de outro segmento, reforçando a mesma percepção de "categoria não provisionada".

-- 1. Linka as 4 features ao módulo real, igual as 14 irmãs já linkadas.
INSERT INTO public.system_feature_modules (feature_id, module_id)
SELECT sf.id, '437c2d73-230e-4bfb-93f6-91badd103c8e'::uuid
FROM public.system_features sf
WHERE sf.id IN (106, 107, 108, 109)
ON CONFLICT (feature_id, module_id) DO NOTHING;

-- 2. Para de seedar automaticamente em todo tenant novo — só passam a ser provisionadas
--    quando o Master de fato seleciona o módulo de Campanhas pro tenant.
UPDATE public.system_features
SET is_default_tenant_admin_feature = false
WHERE id IN (106, 107, 108, 109);

-- 3. Corrige o mapeamento de categoria da feature "Usuários" — volta pra Permissões, sua
--    categoria padrão real (system_features.category_id), sem nenhuma razão de negócio pra
--    estar em "Gestão Administrativa Imóveis".
UPDATE public.system_feature_categorias
SET category_id = 2
WHERE feature_id = 6 AND category_id = 3;

-- 4. Limpeza retroativa — só nos tenants que NÃO têm o módulo de Campanhas contratado
--    (tenant_modules), onde essas 4 features vazaram pelo bug acima sem nenhum direito real.
--    Tenants que JÁ têm o módulo contratado (Imobiliaria XYZ, Imovitec, Marketing Digital,
--    e os tenants de teste com Campanhas) mantêm o acesso intacto — nenhuma regressão real,
--    já que remover e depender só do link novo (passo 1) exigiria um re-save manual da tela
--    de provisionamento pra cada um, o que não é o objetivo desta correção.
DELETE FROM public.tenant_feature_overrides tfo
WHERE tfo.feature_id IN (106, 107, 108, 109)
  AND NOT EXISTS (
    SELECT 1 FROM public.tenant_modules tm
    WHERE tm.tenant_id = tfo.tenant_id
      AND tm.module_id = '437c2d73-230e-4bfb-93f6-91badd103c8e'::uuid
      AND tm.is_enabled = true
  )
  -- Master Platform bypassa Filtro B inteiramente (v_is_master=true na função de sidebar) —
  -- sua linha de tenant_feature_overrides nunca teve efeito prático, deixada intacta por não
  -- ser necessário mexer nela pra resolver o bug relatado.
  AND tfo.tenant_id <> (SELECT id FROM public.tenants WHERE slug = 'all-business-master' OR name ILIKE '%Master Platform%' LIMIT 1);

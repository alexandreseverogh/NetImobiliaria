-- ============================================================
-- Migration: Aprovações do Agente — acesso para tenant admins
-- Data: 2026-06-23
--
-- Problema: feature estava em categoria 22 (Master Governance),
-- visível apenas para usuários master. Tenant admins precisam
-- aprovar/rejeitar ações do agente para seus próprios tenants.
--
-- Solução:
--   1. Mover para categoria 30 (Campanhas de Marketing Digital)
--   2. Provisionar para todos os tenants reais (exceto Master Platform)
--   3. Marcar como feature padrão de tenant admin
-- ============================================================

BEGIN;

-- 1. Mover para categoria 30 (Campanhas de Marketing Digital)
UPDATE public.system_features
SET category_id = 30,
    updated_at  = NOW()
WHERE id = 106
  AND slug = 'master-aprovacoes-agente';

-- 2. Provisionar para todos os tenants reais (exceto Master Platform)
INSERT INTO public.tenant_feature_overrides (id, tenant_id, feature_id, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  t.id,
  106,
  true,
  NOW(),
  NOW()
FROM public.tenants t
WHERE t.id <> '00000000-0000-0000-0000-000000000001'::uuid  -- exclui Master Platform
ON CONFLICT (tenant_id, feature_id) DO UPDATE
  SET is_active  = true,
      updated_at = NOW();

-- 3. Feature disponível por padrão para novos tenants
UPDATE public.system_features
SET is_default_tenant_admin_feature = true,
    updated_at = NOW()
WHERE id = 106;

COMMIT;

-- Verificação:
-- SELECT sf.id, sf.name, sf.category_id, sc.name AS category_name, sf.is_default_tenant_admin_feature
-- FROM public.system_features sf
-- JOIN public.system_categorias sc ON sc.id = sf.category_id
-- WHERE sf.id = 106;
--
-- SELECT tfo.tenant_id, t.name, tfo.is_active
-- FROM public.tenant_feature_overrides tfo
-- JOIN public.tenants t ON t.id = tfo.tenant_id
-- WHERE tfo.feature_id = 106;

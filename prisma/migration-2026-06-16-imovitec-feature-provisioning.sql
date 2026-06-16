-- Migration: Provisionamento das features de campanhas para Imovitec
-- Problema: 4 features (101, 102, 103, 104) foram adicionadas após o provisionamento
-- inicial da Imovitec e não estão em tenant_feature_overrides nem em system_feature_modules.
-- Feature 102 também estava inativa.
-- Referência: docs/ACCESS_CONTROL.md

BEGIN;

-- 1. Ativar feature 102 (Insights Cruzados) que estava inativa
UPDATE public.system_features SET is_active = true WHERE id = 102;

-- 2. Adicionar permissões que faltam para feature 102 e 103
INSERT INTO public.permissions (feature_id, action)
VALUES
  (102, 'read'),
  (102, 'execute'),
  (103, 'read'),
  (103, 'execute')
ON CONFLICT (feature_id, action) DO NOTHING;

-- 3. Vincular features 101, 102, 103, 104 ao módulo trafego-pago
-- (necessário para aparecerem na tela de provisionamento do Master)
INSERT INTO public.system_feature_modules (feature_id, module_id)
VALUES
  (101, '437c2d73-230e-4bfb-93f6-91badd103c8e'),
  (102, '437c2d73-230e-4bfb-93f6-91badd103c8e'),
  (103, '437c2d73-230e-4bfb-93f6-91badd103c8e'),
  (104, '437c2d73-230e-4bfb-93f6-91badd103c8e')
ON CONFLICT (feature_id, module_id) DO NOTHING;

-- 4. Provisionar para Imovitec (tenant_id = a6281640-194d-42e7-b822-9f2718c1f873)
INSERT INTO public.tenant_feature_overrides (tenant_id, feature_id, is_active)
VALUES
  ('a6281640-194d-42e7-b822-9f2718c1f873', 101, true),
  ('a6281640-194d-42e7-b822-9f2718c1f873', 102, true),
  ('a6281640-194d-42e7-b822-9f2718c1f873', 103, true),
  ('a6281640-194d-42e7-b822-9f2718c1f873', 104, true)
ON CONFLICT (tenant_id, feature_id) DO UPDATE SET is_active = true;

-- 5. Garantir que Marketing Digital (efbf62cf) também tem todas as features
-- (102 pode não ter sido provisionada lá)
INSERT INTO public.tenant_feature_overrides (tenant_id, feature_id, is_active)
VALUES
  ('efbf62cf-9e28-4b31-a4f6-82a037412353', 102, true)
ON CONFLICT (tenant_id, feature_id) DO UPDATE SET is_active = true;

COMMIT;

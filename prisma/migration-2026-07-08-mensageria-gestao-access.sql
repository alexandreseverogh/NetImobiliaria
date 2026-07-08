-- Migration: Registro de acesso da feature "Painel do Gestor" (PLANO_MENSAGERIA.md seção 17.4)
-- Aditivo à migration-2026-07-07-mensageria-access.sql — módulo 'mensageria' e categoria
-- "Central de Mensagens" já existem, não recriar. 100% idempotente.

BEGIN;

DO $$
DECLARE
  v_mod_id uuid; v_cat_id int; v_feat_id int; v_perm_id int; a text;
BEGIN
  SELECT id INTO v_mod_id FROM public.system_modules   WHERE slug = 'mensageria';
  SELECT id INTO v_cat_id FROM public.system_categorias WHERE slug = 'mensageria';

  -- feature (cria se não existir)
  SELECT id INTO v_feat_id FROM public.system_features WHERE slug = 'mensageria-gestao';
  IF v_feat_id IS NULL THEN
    INSERT INTO public.system_features (name, slug, url, category_id, sort_order, is_active, icon)
    VALUES ('Painel do Gestor', 'mensageria-gestao', '/mensageria/gestao', v_cat_id, 6, true, 'ChartBarIcon')
    RETURNING id INTO v_feat_id;
  END IF;

  -- vínculo feature ↔ módulo
  INSERT INTO public.system_feature_modules (feature_id, module_id)
  VALUES (v_feat_id, v_mod_id) ON CONFLICT DO NOTHING;

  -- permissions + role_permissions globais (Master 41, Administrador 42/47/48)
  -- Administrador vê pelo caminho normal (banco). Líder de time não-admin vê pela
  -- augmentação client em MensageriaLayoutContent (seção 17.4, Opção B) — não precisa
  -- de role_permissions específico pra isso, o endpoint /mensageria/gestao valida o
  -- escopo via resolveMensageriaScope() no server, não via sidebar.
  FOREACH a IN ARRAY ARRAY['read','execute'] LOOP
    SELECT id INTO v_perm_id FROM public.permissions WHERE feature_id = v_feat_id AND action = a;
    IF v_perm_id IS NULL THEN
      INSERT INTO public.permissions (feature_id, action) VALUES (v_feat_id, a) RETURNING id INTO v_perm_id;
    END IF;
    INSERT INTO public.role_permissions (role_id, permission_id, tenant_id)
    SELECT rid, v_perm_id, NULL FROM unnest(ARRAY[41,42,47,48]) AS rid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.role_permissions rp
      WHERE rp.role_id = rid AND rp.permission_id = v_perm_id AND rp.tenant_id IS NULL
    );
  END LOOP;

  -- provisionamento por tenant — mesmos 4 tenants da migration anterior
  INSERT INTO public.tenant_feature_overrides (tenant_id, feature_id, is_active)
  SELECT t.id, v_feat_id, true
  FROM public.tenants t
  WHERE t.id IN (
    'efbf62cf-9e28-4b31-a4f6-82a037412353', -- Marketing Digital
    'c828d003-6213-4464-aa38-6c5d10a0aa9a', -- Imobiliaria XYZ
    'a6281640-194d-42e7-b822-9f2718c1f873', -- Imovitec
    '00000000-0000-0000-0000-000000000001'  -- Master Platform
  )
  ON CONFLICT (tenant_id, feature_id) DO UPDATE SET is_active = true;
END $$;

COMMIT;

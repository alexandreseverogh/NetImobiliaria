-- Migration: Registro de acesso do módulo Mensageria (FASE M6 antecipada para testes de UI)
-- Ver docs/PLANO_MENSAGERIA.md seção 15 e docs/ACCESS_CONTROL.md
-- 100% idempotente — pode ser re-executada sem duplicar dados.
--
-- Etapas:
--   1) system_modules      → módulo "Gestão de Mensageria"
--   2) system_categorias   → categoria "Central de Mensagens" (vinculada ao módulo)
--   3) system_features     → 5 features (inbox, analytics, config, chatbot, conhecimento)
--   4) permissions         → read/execute/create/delete por feature
--   5) system_feature_modules → vínculo feature↔módulo (obrigatório p/ aparecer no provisionamento)
--   6) role_permissions    → Master (41) + Administrador (42, 47, 48), tenant_id NULL = global
--   7) tenant_feature_overrides → provisiona os 4 tenants ativos (decisão explícita para testes de UI)

BEGIN;

-- 1) MÓDULO
INSERT INTO public.system_modules (name, slug, description, icon, is_active, theme_mode, primary_color)
VALUES (
  'Gestão de Mensageria', 'mensageria',
  'Central omnichannel: caixa de entrada unificada (WhatsApp, formulários, manual, webchat), chatbot por segmento e analytics de mensagens.',
  'ChatBubbleLeftRightIcon', true, 'dark', '#c5a028'
)
ON CONFLICT (slug) DO NOTHING;

-- 2) CATEGORIA (vinculada ao módulo)
INSERT INTO public.system_categorias (name, slug, description, icon, color, sort_order, is_active, module_id)
SELECT 'Central de Mensagens', 'mensageria',
       'Caixa de entrada, chatbot e analytics de mensagens', 'ChatBubbleLeftRightIcon', '#c5a028', 40, true, m.id
FROM public.system_modules m
WHERE m.slug = 'mensageria'
  AND NOT EXISTS (SELECT 1 FROM public.system_categorias WHERE slug = 'mensageria');

-- 3+4+5+6) FEATURES + PERMISSIONS + FEATURE↔MODULE + ROLE_PERMISSIONS
DO $$
DECLARE
  v_mod_id uuid; v_cat_id int; v_feat_id int; v_perm_id int;
  r record; a text;
BEGIN
  SELECT id INTO v_mod_id FROM public.system_modules   WHERE slug = 'mensageria';
  SELECT id INTO v_cat_id FROM public.system_categorias WHERE slug = 'mensageria';

  FOR r IN SELECT * FROM (VALUES
      ('Caixa de Entrada',      'mensageria-inbox',        '/mensageria',                     1, ARRAY['read','execute']),
      ('Analytics de Mensagens','mensageria-analytics',    '/mensageria/analytics',           2, ARRAY['read']),
      ('Configurações',         'mensageria-config',       '/mensageria/config',              3, ARRAY['read','execute']),
      ('Chatbot',               'mensageria-chatbot',      '/mensageria/config/chatbot',      4, ARRAY['read','execute']),
      ('Base de Conhecimento',  'mensageria-conhecimento', '/mensageria/config/conhecimento', 5, ARRAY['read','execute','create','delete'])
    ) AS t(name, slug, url, sort_order, actions)
  LOOP
    -- feature (cria se não existir)
    SELECT id INTO v_feat_id FROM public.system_features WHERE slug = r.slug;
    IF v_feat_id IS NULL THEN
      INSERT INTO public.system_features (name, slug, url, category_id, sort_order, is_active, icon)
      VALUES (r.name, r.slug, r.url, v_cat_id, r.sort_order, true, 'ChatBubbleLeftRightIcon')
      RETURNING id INTO v_feat_id;
    END IF;

    -- vínculo feature ↔ módulo (obrigatório p/ aparecer no provisionamento)
    INSERT INTO public.system_feature_modules (feature_id, module_id)
    VALUES (v_feat_id, v_mod_id) ON CONFLICT DO NOTHING;

    -- permissions + role_permissions (globais, tenant_id NULL — mesmo padrão de campanhas)
    FOREACH a IN ARRAY r.actions LOOP
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

    -- 7) provisionamento por tenant — decisão explícita para destravar os testes de UI
    --    (Master Platform não precisa: bypass total por is_system_role, mas não faz mal ter)
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
  END LOOP;
END $$;

COMMIT;

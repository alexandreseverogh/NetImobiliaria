-- Parte 1 do plano de unificação Meta/WhatsApp (docs/PLANO_WHATSAPP_CLOUD_API_PROVIDER.md §9/§10):
-- nova feature "Dados da Empresa" — self-service do PRÓPRIO tenant admin pra campos tenant-wide
-- que hoje só existem dentro de Campanhas (Meta Ads App) ou Mensageria (Evolution/WhatsApp
-- provider), ambos gated por módulo de billing. Marcada is_default_tenant_admin_feature=true —
-- mesmo mecanismo já usado por Usuários/Permissões/Perfis/Sessões: SEMPRE provisionada pra
-- TODO tenant admin, independente de Campanhas/Mensageria/CRM terem sido contratados.

DO $$
DECLARE
  v_feature_id INTEGER;
BEGIN
  INSERT INTO public.system_features (name, slug, description, category_id, url, is_active,
                                       is_default_tenant_admin_feature, sort_order, icon)
  VALUES ('Dados da Empresa', 'dados-empresa',
          'Identidade Meta, Evolution API e provider de WhatsApp do seu tenant — independente de quais módulos você contratou',
          1, '/admin/dados-empresa', true, true, 5, 'buildingoffice2icon')
  RETURNING id INTO v_feature_id;

  -- 5 ações padrão, mesmo conjunto já usado por outras features (configuracoes-campanhas etc.)
  INSERT INTO public.permissions (feature_id, action)
  SELECT v_feature_id, a FROM (VALUES ('read'), ('create'), ('update'), ('delete'), ('execute')) AS t(a);

  -- Backfill retroativo pros roles de tenant-admin já existentes (name ILIKE '%admin%') — mesmo
  -- critério já usado por getUserPermissions() REGRA 2 (bypass), aqui só garantindo o caminho
  -- não-bypass também (roles cujo nome não bata o padrão, se algum dia existir).
  INSERT INTO public.role_permissions (role_id, permission_id, granted_by, granted_at)
  SELECT ur.id, p.id, NULL, NOW()
    FROM public.user_roles ur
    JOIN public.permissions p ON p.feature_id = v_feature_id
   WHERE ur.name ILIKE '%admin%'
  ON CONFLICT DO NOTHING;

  -- Backfill retroativo: todo tenant ATIVO ganha a feature essencial (mesma lógica do passo 7
  -- de POST /api/admin/master/tenants, só que aplicada agora pros tenants que já existiam antes
  -- dessa feature ser criada — a lógica de criação só roda na hora de criar um tenant NOVO).
  INSERT INTO public.tenant_feature_overrides (tenant_id, feature_id, is_active)
  SELECT t.id, v_feature_id, true
    FROM public.tenants t
   WHERE t.status = 'active'
  ON CONFLICT (tenant_id, feature_id) DO UPDATE SET is_active = true;

  RAISE NOTICE 'Feature "Dados da Empresa" criada com id = %', v_feature_id;
END $$;

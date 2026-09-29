-- Migração: 2026-09-28
-- Ordem PESSOAL das categorias (opções agrupadoras) da sidebar — por usuário logado, não
-- global. Distinto de system_categorias.sort_order (a ordem-padrão da plataforma, editável
-- pelo Master em /admin/master/cockpit, que continua valendo como fallback): esta tabela é
-- uma preferência individual, só afeta a sidebar de QUEM salvou, nunca muda o que outros
-- usuários (incluindo outros Masters) veem.
--
-- get_sidebar_menu_for_user() recebe p_user_id já como parâmetro — só precisou de um LEFT
-- JOIN a mais na CTE category_structure, com COALESCE priorizando a preferência pessoal
-- sobre o sort_order global. Idempotente — seguro rodar mais de uma vez.

CREATE TABLE IF NOT EXISTS public.user_sidebar_category_order (
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES public.system_categorias(id) ON DELETE CASCADE,
  sort_order  INTEGER NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, category_id)
);

CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(p_user_id uuid, p_system_id text DEFAULT 'admin'::text, p_tenant_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  DECLARE
      v_is_master BOOLEAN := false;
      v_is_tenant_admin BOOLEAN := false;
      v_menu JSONB;
  BEGIN
      SELECT EXISTS (
          SELECT 1 FROM public.user_role_assignments ura
          JOIN public.user_roles ur ON ura.role_id = ur.id
          WHERE ura.user_id = p_user_id AND ur.is_system_role = true
          UNION
          SELECT 1 FROM public.user_tenant_membership utm
          JOIN public.user_roles ur ON utm.role_id = ur.id
          WHERE utm.user_id = p_user_id AND ur.is_system_role = true
      ) INTO v_is_master;

      IF p_tenant_id IS NOT NULL THEN
          SELECT EXISTS (
              SELECT 1 FROM public.user_tenant_membership utm
              JOIN public.user_roles ur ON utm.role_id = ur.id
              WHERE utm.user_id = p_user_id
                AND utm.tenant_id = p_tenant_id
                AND (ur.name ILIKE '%admin%')
          ) INTO v_is_tenant_admin;
      END IF;

      WITH permitted_features AS (
          SELECT DISTINCT sf.*
          FROM public.system_features sf
          WHERE sf.is_active = true
            AND sf.url IS NOT NULL AND sf.url <> ''
            AND (
              v_is_master = true OR
              v_is_tenant_admin = true OR
              EXISTS (
                  SELECT 1 FROM public.permissions p
                  JOIN public.role_permissions rp ON rp.permission_id = p.id
                  JOIN (
                      SELECT role_id FROM public.user_role_assignments WHERE user_id = p_user_id
                      UNION
                      SELECT role_id FROM public.user_tenant_membership WHERE user_id = p_user_id AND (tenant_id = p_tenant_id OR p_tenant_id IS NULL)
                  ) uar ON uar.role_id = rp.role_id
                  WHERE p.feature_id = sf.id
                    AND (LOWER(p.action) IN ('read', 'view', 'execute', 'visualizar', 'acessar'))
              )
            )
            AND (
              v_is_master = true OR
              p_tenant_id IS NULL OR
              EXISTS (
                  SELECT 1 FROM public.tenant_feature_overrides tfo
                  WHERE tfo.feature_id = sf.id AND tfo.tenant_id = p_tenant_id AND tfo.is_active = true
              )
            )
            AND (
              v_is_master = true OR
              NOT EXISTS (
                  SELECT 1
                  FROM public.system_feature_modules sfm
                  JOIN public.system_modules sm ON sm.id = sfm.module_id
                  JOIN public.tenant_modules tm ON tm.module_id = sfm.module_id AND tm.tenant_id = p_tenant_id
                  WHERE sfm.feature_id = sf.id
                    AND tm.is_enabled = true
                    AND COALESCE(tm.billing_status, 'active') = 'past_due'
                    AND NOT (
                      (sm.slug = 'trafego-pago' AND EXISTS (
                            SELECT 1 FROM public.tenants t WHERE t.id = p_tenant_id AND t.isento_marketingdigital = true)) OR
                      (sm.slug = 'mensageria' AND EXISTS (
                            SELECT 1 FROM public.tenants t WHERE t.id = p_tenant_id AND t.isento_mensageria = true)) OR
                      (sm.slug = 'crm' AND EXISTS (
                            SELECT 1 FROM public.tenants t WHERE t.id = p_tenant_id AND t.isento_crm = true))
                    )
              )
            )
      ),
      feature_to_category AS (
          SELECT pf.id as feature_id, sfc.category_id
          FROM permitted_features pf
          JOIN public.system_feature_categorias sfc ON pf.id = sfc.feature_id
          JOIN public.system_categorias sc ON sfc.category_id = sc.id
          WHERE sc.is_active = true AND pf.group_id IS NULL
          UNION
          SELECT pf.id as feature_id, pf.category_id
          FROM permitted_features pf
          JOIN public.system_categorias sc ON pf.category_id = sc.id
          WHERE sc.is_active = true
            AND pf.group_id IS NULL
            AND NOT EXISTS (
                SELECT 1 FROM public.system_feature_categorias sfc
                JOIN public.system_categorias sc2 ON sfc.category_id = sc2.id
                WHERE sfc.feature_id = pf.id AND sc2.is_active = true
            )
      ),
      group_agg AS (
          SELECT
              sfg.id AS group_id,
              sfg.name AS group_name,
              sfg.icon AS group_icon,
              sfg.category_id AS category_id,
              COALESCE(sfg.sort_order, 0) AS group_order,
              jsonb_agg(
                  jsonb_build_object(
                      'id', pf.id,
                      'name', pf.name,
                      'path', pf.url,
                      'icon', COALESCE(pf.icon, 'default')
                  ) ORDER BY COALESCE(pf.sort_order_in_group, 0), pf.name
              ) AS tabs,
              COALESCE(
                  (SELECT pf2.url FROM permitted_features pf2 WHERE pf2.group_id = sfg.id AND pf2.is_default_tab = true LIMIT 1),
                  (SELECT pf3.url FROM permitted_features pf3 WHERE pf3.group_id = sfg.id ORDER BY COALESCE(pf3.sort_order_in_group, 0), pf3.name LIMIT 1)
              ) AS default_path
          FROM public.system_feature_groups sfg
          JOIN permitted_features pf ON pf.group_id = sfg.id
          WHERE sfg.is_active = true
          GROUP BY sfg.id, sfg.name, sfg.icon, sfg.category_id, sfg.sort_order
      ),
      category_module_gate AS (
          SELECT sc.id AS category_id
          FROM public.system_categorias sc
          WHERE sc.is_active = true
            AND (
              v_is_master = true OR
              sc.module_id IS NULL OR
              EXISTS (SELECT 1 FROM public.tenant_modules tm WHERE tm.module_id = sc.module_id AND tm.tenant_id = p_tenant_id AND tm.is_enabled = true) OR
              EXISTS (
                  SELECT 1 FROM feature_to_category ftc2
                  JOIN public.tenant_feature_overrides tfo ON tfo.feature_id = ftc2.feature_id
                  WHERE ftc2.category_id = sc.id AND tfo.tenant_id = p_tenant_id AND tfo.is_active = true
              ) OR
              EXISTS (
                  SELECT 1 FROM public.system_feature_groups sfg
                  JOIN permitted_features pf ON pf.group_id = sfg.id
                  JOIN public.tenant_feature_overrides tfo ON tfo.feature_id = pf.id
                  WHERE sfg.category_id = sc.id AND tfo.tenant_id = p_tenant_id AND tfo.is_active = true
              )
            )
      ),
      category_structure AS (
          SELECT
              sc.id as category_id,
              sc.name as category_name,
              sc.icon as category_icon,
              -- ÚNICA mudança real desta migração: preferência pessoal (usco.sort_order)
              -- prioriza sobre o sort_order global do Master, categoria a categoria; sem
              -- preferência salva pra este usuário, cai no comportamento de sempre.
              COALESCE(usco.sort_order, sc.sort_order, 0) as category_order,
              jsonb_agg(items.child ORDER BY items.child_order, items.child_name) as children
          FROM public.system_categorias sc
          JOIN category_module_gate cmg ON cmg.category_id = sc.id
          LEFT JOIN public.user_sidebar_category_order usco
            ON usco.category_id = sc.id AND usco.user_id = p_user_id
          JOIN LATERAL (
              SELECT
                  jsonb_build_object('id', pf.id, 'name', pf.name, 'path', pf.url, 'icon', COALESCE(pf.icon, 'default')) AS child,
                  COALESCE(pf.sort_order, 0) AS child_order,
                  pf.name AS child_name
              FROM feature_to_category ftc
              JOIN permitted_features pf ON pf.id = ftc.feature_id
              WHERE ftc.category_id = sc.id

              UNION ALL

              SELECT
                  jsonb_build_object(
                      'id', 'grp-' || ga.group_id::text,
                      'name', ga.group_name,
                      'path', ga.default_path,
                      'icon', COALESCE(ga.group_icon, 'default'),
                      'isGroup', true,
                      'tabs', ga.tabs
                  ) AS child,
                  ga.group_order AS child_order,
                  ga.group_name AS child_name
              FROM group_agg ga
              WHERE ga.category_id = sc.id
          ) items ON true
          WHERE sc.is_active = true
          GROUP BY sc.id, sc.name, sc.icon, sc.sort_order, usco.sort_order
      )
      SELECT
          jsonb_agg(
              jsonb_build_object(
                  'id', category_id,
                  'name', category_name,
                  'icon', category_icon,
                  'children', children
              ) ORDER BY category_order, category_name
          )
      INTO v_menu
      FROM category_structure;

      RETURN COALESCE(v_menu, '[]'::jsonb);
  END;
  $function$;

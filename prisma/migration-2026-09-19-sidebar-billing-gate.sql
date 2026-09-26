-- Adiciona o gate de cobrança (Stripe) a get_sidebar_menu_for_user() —
-- ÚNICA mudança real: FILTRO B ("PROVISÃO DA EMPRESA", dentro da CTE
-- permitted_features) ganha uma condição extra de inadimplência. Todo o
-- resto da função é reproduzido byte-a-byte do dump real tirado do banco
-- em 2026-09-19 (pg_get_functiondef) — nenhuma outra linha foi tocada.
--
-- Achado real, não hipotético, que definiu ONDE o gate deveria entrar:
-- testei primeiro colocar o gate em category_module_gate (o EXISTS de
-- tenant_modules.is_enabled) — e provei ao vivo que isso teria ZERO efeito
-- prático: TODO tenant real conferido nesta sessão (CRM SOZINHO —
-- IMOBILIÁRIO, Marketing Digital) provisiona suas features via
-- tenant_feature_overrides individual (o "escape hatch" que já existia,
-- 2ª/3ª cláusula OR de category_module_gate), não pelo bulk de
-- tenant_modules — então bloquear só o 1º OR nunca teria efeito real.
--
-- Corrigido colocando o gate na camada certa: FILTRO B, que já é onde a
-- função decide "esta feature está provisionada pra este tenant" — tanto
-- pelo caminho de tenant_feature_overrides quanto (indiretamente, via
-- category_module_gate mais adiante) pelo caminho de módulo bulk. Uma
-- feature só é oferecida se, além de provisionada, o MÓDULO real dela
-- (via system_feature_modules — a tabela que já é a fonte de verdade de
-- "esta feature pertence a este módulo", documentada em ACCESS_CONTROL.md)
-- não estiver com billing_status='past_due' para este tenant — com bypass
-- via tenants.isento_marketingdigital/isento_mensageria/isento_crm. Feature
-- sem nenhum module_id vinculado (órfã) ou vinculada só a módulo não-
-- billável nunca é afetada.
--
-- Efeito imediato desta migração: NENHUM. billing_status é NOT NULL
-- DEFAULT 'active' em toda linha existente de tenant_modules — a condição
-- nova é sempre verdadeira até o dia em que o webhook da Stripe de fato
-- marcar algum módulo como 'past_due'. Sidebar de todo tenant continua
-- idêntica até lá.

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
      -- 1. Identificar se o usuário é Master Admin (Acesso Global)
      SELECT EXISTS (
          SELECT 1 FROM public.user_role_assignments ura
          JOIN public.user_roles ur ON ura.role_id = ur.id
          WHERE ura.user_id = p_user_id AND ur.is_system_role = true
          UNION
          SELECT 1 FROM public.user_tenant_membership utm
          JOIN public.user_roles ur ON utm.role_id = ur.id
          WHERE utm.user_id = p_user_id AND ur.is_system_role = true
      ) INTO v_is_master;

      -- 1b. Identificar se o usuário é Admin do Tenant
      IF p_tenant_id IS NOT NULL THEN
          SELECT EXISTS (
              SELECT 1 FROM public.user_tenant_membership utm
              JOIN public.user_roles ur ON utm.role_id = ur.id
              WHERE utm.user_id = p_user_id
                AND utm.tenant_id = p_tenant_id
                AND (ur.name ILIKE '%admin%')
          ) INTO v_is_tenant_admin;
      END IF;

      -- 2. CTE de Funcionalidades Permitidas e Provisionadas (inclui group_id/sort_order_in_group/
      --    is_default_tab via sf.* — nenhum filtro novo aqui, aba de grupo passa pelos MESMOS
      --    3 filtros de sempre, feature a feature)
      WITH permitted_features AS (
          SELECT DISTINCT sf.*
          FROM public.system_features sf
          WHERE sf.is_active = true
            -- FILTRO C: só entra quem tem uma página real de verdade
            AND sf.url IS NOT NULL AND sf.url <> ''
            -- FILTRO A: PERMISSÃO DO PERFIL OU ADMIN
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
            -- FILTRO B: PROVISÃO DA EMPRESA
            AND (
              v_is_master = true OR
              p_tenant_id IS NULL OR
              EXISTS (
                  SELECT 1 FROM public.tenant_feature_overrides tfo
                  WHERE tfo.feature_id = sf.id AND tfo.tenant_id = p_tenant_id AND tfo.is_active = true
              )
            )
            -- FILTRO D (2026-09-19): COBRANÇA (Stripe) — bloqueia a feature se o
            -- MÓDULO real dela (system_feature_modules → system_modules) estiver
            -- inadimplente para este tenant, exceto Master e exceto quando o
            -- tenant é isento daquele módulo. Feature sem módulo vinculado, ou
            -- cujo módulo nunca ficou past_due, passa direto (NOT EXISTS vazio).
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
      -- 3. Mapeamento Robusto de Funcionalidades SOLTAS (sem grupo) para Categorias
      feature_to_category AS (
          -- Prioridade 1: Mapeamento explícito
          SELECT pf.id as feature_id, sfc.category_id
          FROM permitted_features pf
          JOIN public.system_feature_categorias sfc ON pf.id = sfc.feature_id
          JOIN public.system_categorias sc ON sfc.category_id = sc.id
          WHERE sc.is_active = true AND pf.group_id IS NULL
          UNION
          -- Prioridade 2: Categoria padrão
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
      -- 3b. Agregação de abas visíveis por Grupo — 1 linha por grupo com pelo menos 1 aba
      --     visível a este usuário; a aba padrão só conta se ELA MESMA estiver visível, senão
      --     cai pra 1ª aba visível por ordem (nunca leva a sidebar pra um link morto).
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
      -- 4. Gate de módulo/provisão POR CATEGORIA — precisa olhar tanto features soltas quanto
      --    abas de grupo que mapeiam pra essa categoria (senão uma categoria só-de-grupo nunca
      --    passaria pelo "provisionou 1 feature específica" escape hatch que já existia)
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
      -- 5. Construção da Estrutura — cada categoria agrega tanto features soltas quanto grupos
      category_structure AS (
          SELECT
              sc.id as category_id,
              sc.name as category_name,
              sc.icon as category_icon,
              COALESCE(sc.sort_order, 0) as category_order,
              jsonb_agg(items.child ORDER BY items.child_order, items.child_name) as children
          FROM public.system_categorias sc
          JOIN category_module_gate cmg ON cmg.category_id = sc.id
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
          GROUP BY sc.id, sc.name, sc.icon, sc.sort_order
      )
      -- 6. Agregação Final
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

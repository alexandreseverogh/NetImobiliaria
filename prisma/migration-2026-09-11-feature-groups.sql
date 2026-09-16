-- Grupos de Funcionalidades: 3º nível opcional entre Categoria (seção vertical da sidebar) e
-- Funcionalidade (página real). Um Grupo = 1 item clicável na sidebar; ao entrar, as
-- funcionalidades vinculadas a ele aparecem como abas horizontais acima da página. Zero eixo
-- novo de permissão/provisionamento — visibilidade do grupo é só "tem ≥1 aba visível pra este
-- usuário", mesma regra OR que Categoria já usa hoje pras próprias features.

CREATE TABLE IF NOT EXISTS public.system_feature_groups (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  icon        VARCHAR(100) DEFAULT 'Squares2X2Icon',
  category_id INTEGER REFERENCES public.system_categorias(id) ON DELETE SET NULL,
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_system_feature_groups_category_id
  ON public.system_feature_groups(category_id);

ALTER TABLE public.system_features
  ADD COLUMN IF NOT EXISTS group_id INTEGER REFERENCES public.system_feature_groups(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sort_order_in_group INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_default_tab BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_system_features_group_id
  ON public.system_features(group_id);

-- Só 1 aba padrão por grupo — reforçado no banco, não só na UI (a aba padrão decide pra onde
-- o clique na sidebar leva quando o grupo tem mais de 1 aba visível).
CREATE UNIQUE INDEX IF NOT EXISTS idx_system_features_one_default_tab
  ON public.system_features(group_id) WHERE is_default_tab = true;

-- Registra a tela nova do Master na sidebar (categoria "Sistema", id 1 — mesma categoria de
-- "Categorias de Funcionalidades"). Feature Master-only: sem linha em permissions/
-- role_permissions, Master já bypassa o Filtro A da função de sidebar (v_is_master=true).
INSERT INTO public.system_features (name, description, url, is_active, sort_order, icon, "Crud_Execute")
SELECT
  'Grupos de Funcionalidades',
  'Agrupa funcionalidades relacionadas numa barra de abas horizontal, acima da página, acessível por um único item da sidebar.',
  '/admin/master/feature-groups',
  true, 2, 'Squares2X2Icon', 'CRUD'
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_features WHERE url = '/admin/master/feature-groups'
);

INSERT INTO public.system_feature_categorias (feature_id, category_id, sort_order)
SELECT sf.id, 1, 2
FROM public.system_features sf
WHERE sf.url = '/admin/master/feature-groups'
  AND NOT EXISTS (
    SELECT 1 FROM public.system_feature_categorias sfc
    WHERE sfc.feature_id = sf.id AND sfc.category_id = 1
  );

-- ═══════════════════════════════════════════════════════════════════════════
-- get_sidebar_menu_for_user — ganha suporte a Grupos, sem tocar no comportamento
-- vertical já existente (children continua reservado pra árvore de categoria).
-- Feature com group_id preenchido deixa de virar item solto da sidebar e passa a
-- surgir só dentro do node do próprio grupo, no novo campo `tabs`.
-- ═══════════════════════════════════════════════════════════════════════════
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

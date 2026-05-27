-- 1. ATUALIZAR A FUNÇÃO DE FILTRO (VERSÃO FINAL ROBUSTA)
CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(p_user_id uuid, p_system_id text DEFAULT 'admin')
 RETURNS TABLE(id integer, parent_id integer, name character varying, icon_name character varying, url character varying, order_index integer, has_permission boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $f$
BEGIN
    RETURN QUERY
    SELECT
        smi.id,
        smi.parent_id,
        smi.name,
        smi.icon_name,
        -- No CRM, removemos a URL dos pais para forçar a abertura do submenu
        CASE 
            WHEN p_system_id = 'crm' AND EXISTS (SELECT 1 FROM public.sidebar_menu_items sub WHERE sub.parent_id = smi.id AND sub.is_active = true) THEN NULL
            ELSE smi.url 
        END as url,
        smi.order_index,
        true as has_permission
    FROM public.sidebar_menu_items smi
    WHERE smi.is_active = true
    AND (
        (p_system_id = 'crm' AND smi.system_id IN ('crm', 'both'))
        OR 
        (p_system_id = 'admin' AND (smi.system_id IN ('admin', 'both') OR smi.system_id IS NULL))
    )
    ORDER BY smi.order_index;
END;
$f$;

-- 2. RESET GERAL E LIMPEZA
UPDATE public.sidebar_menu_items SET system_id = 'admin';
DELETE FROM public.sidebar_menu_items WHERE system_id = 'crm';

-- 3. DEFINIR ITENS COMPARTILHADOS (BOTH)
-- Painel do Sistema e Dashboard
UPDATE public.sidebar_menu_items SET system_id = 'both' WHERE id IN (1, 2);
-- Painel Administrativo e seus subitens selecionados
UPDATE public.sidebar_menu_items SET system_id = 'both' WHERE id IN (3, 4, 5, 6, 7, 8);
-- Clientes (Item principal)
UPDATE public.sidebar_menu_items SET system_id = 'both' WHERE name = 'Clientes' AND parent_id IS NULL;

-- 4. RECONSTRUÇÃO DA CATEGORIA CRM E TODAS AS SUAS SUB-PÁGINAS
INSERT INTO public.sidebar_menu_items (name, icon_name, url, order_index, system_id, is_active)
VALUES ('CRM', 'RocketLaunchIcon', null, 5, 'crm', true);

DO $$
DECLARE
    v_crm_root integer;
    v_crm_config integer;
BEGIN
    -- Pegar o ID da raiz do CRM
    SELECT id INTO v_crm_root FROM public.sidebar_menu_items WHERE name = 'CRM' AND system_id = 'crm' LIMIT 1;
    
    -- Itens principais do CRM
    INSERT INTO public.sidebar_menu_items (parent_id, name, icon_name, url, order_index, system_id) VALUES
    (v_crm_root, 'Dashboard de ROI', 'PresentationChartLineIcon', '/crm', 1, 'crm'),
    (v_crm_root, 'Kanban de Leads', 'ViewColumnsIcon', '/crm/kanban', 2, 'crm'),
    (v_crm_root, 'Gestão de Leads', 'UserPlusIcon', '/crm/leads', 3, 'crm'),
    (v_crm_root, 'Análise de Ciclos', 'ClockIcon', '/crm/dashboards/ciclos', 4, 'crm');

    -- Sub-categoria: Configurações do CRM
    INSERT INTO public.sidebar_menu_items (parent_id, name, icon_name, url, order_index, system_id)
    VALUES (v_crm_root, 'Configurações CRM', 'AdjustmentsHorizontalIcon', null, 10, 'crm')
    RETURNING id INTO v_crm_config;

    -- Sub-itens de Configuração
    INSERT INTO public.sidebar_menu_items (parent_id, name, icon_name, url, order_index, system_id) VALUES
    (v_crm_config, 'Segmentos de Negócio', 'Squares2X2Icon', '/crm/config/segmentos', 11, 'crm'),
    (v_crm_config, 'Estratégia de Marketing', 'MegaphoneIcon', '/crm/config/marketing', 12, 'crm'),
    (v_crm_config, 'Personalização Kanban', 'ViewColumnsIcon', '/crm/config/kanban', 13, 'crm'),
    (v_crm_config, 'Inteligência Artificial', 'SparklesIcon', '/crm/config/ia', 14, 'crm');

END $$;

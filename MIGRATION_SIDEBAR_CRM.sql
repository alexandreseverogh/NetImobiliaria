-- SCRIPT DE MIGRAÇÃO: SEPARAÇÃO ADMIN/CRM
-- 1. Adicionar coluna system_id (se não existir)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='sidebar_menu_items' AND COLUMN_NAME='system_id') THEN
        ALTER TABLE public.sidebar_menu_items ADD COLUMN system_id VARCHAR(50) DEFAULT 'admin';
    END IF;
END $$;

-- 2. Atualizar itens universais (que aparecem em ambos)
UPDATE public.sidebar_menu_items SET system_id = 'both' WHERE id IN (1, 2, 3, 4, 5, 6, 7, 8);

-- 3. Garantir que os itens de admin continuem como admin (incluindo categorias que não queremos no CRM)
UPDATE public.sidebar_menu_items SET system_id = 'admin' WHERE id NOT IN (1, 2, 3, 4, 5, 6, 7, 8);

-- 4. Criar a Nova Categoria 'CRM' e seus itens
-- Primeiro, vamos pegar um order_index que faça sentido (entre o Painel do Sistema e o Administrativo)
INSERT INTO public.sidebar_menu_items (name, icon_name, url, order_index, system_id, is_active)
VALUES ('CRM', 'RocketLaunchIcon', null, 5, 'crm', true);

-- Agora inserimos os filhos da categoria CRM (usando o id da categoria que acabamos de criar)
DO $$
DECLARE
    v_crm_id integer;
BEGIN
    SELECT id INTO v_crm_id FROM public.sidebar_menu_items WHERE name = 'CRM' AND system_id = 'crm' LIMIT 1;

    -- Dashboard CRM (ROI/CAC/VGV)
    INSERT INTO public.sidebar_menu_items (parent_id, name, icon_name, url, order_index, system_id, is_active)
    VALUES (v_crm_id, 'Dashboard Inteligente', 'PresentationChartLineIcon', '/crm', 6, 'crm', true);

    -- Kanban de Leads
    INSERT INTO public.sidebar_menu_items (parent_id, name, icon_name, url, order_index, system_id, is_active)
    VALUES (v_crm_id, 'Kanban de Leads', 'ViewColumnsIcon', '/crm/kanban', 7, 'crm', true);

    -- Gestão de Leads
    INSERT INTO public.sidebar_menu_items (parent_id, name, icon_name, url, order_index, system_id, is_active)
    VALUES (v_crm_id, 'Lista de Leads', 'UserPlusIcon', '/crm/leads', 8, 'crm', true);

    -- Clientes
    INSERT INTO public.sidebar_menu_items (parent_id, name, icon_name, url, order_index, system_id, is_active)
    VALUES (v_crm_id, 'Meus Clientes', 'UserGroupIcon', '/crm/clientes', 10, 'crm', true);

    -- Configurações de Enriquecimento
    INSERT INTO public.sidebar_menu_items (parent_id, name, icon_name, url, order_index, system_id, is_active)
    VALUES (v_crm_id, 'Configurações CRM', 'AdjustmentsHorizontalIcon', '/crm/configuracoes', 11, 'crm', true);

END $$;

-- 5. Atualizar a função de busca para respeitar o system_id
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
        smi.url,
        smi.order_index,
        true as has_permission
    FROM public.sidebar_menu_items smi
    WHERE smi.is_active = true
    AND (
        smi.system_id = p_system_id 
        OR smi.system_id = 'both'
        OR (p_system_id = 'admin' AND smi.system_id IS NULL)
    )
    ORDER BY smi.order_index;
END;
$f$;

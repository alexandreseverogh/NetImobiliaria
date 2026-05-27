-- REFINED FIX CRM SIDEBAR ITEMS
-- Data: 2026-05-13
-- Unificar itens do CRM sob o pai principal e corrigir URLs

BEGIN;

DO $$
DECLARE
    v_crm_parent_id integer;
BEGIN
    -- 1. Localizar o ID do Pai 'CRM' principal
    SELECT id INTO v_crm_parent_id FROM public.sidebar_menu_items WHERE name ILIKE 'CRM' AND parent_id IS NULL LIMIT 1;
    
    IF v_crm_parent_id IS NOT NULL THEN
        -- Garantir que o pai seja visível em ambos os sistemas
        UPDATE public.sidebar_menu_items SET system_id = 'both', is_active = true WHERE id = v_crm_parent_id;

        -- 2. Atualizar/Mover itens para debaixo do CRM (ID v_crm_parent_id)
        
        -- ANÁLISE DE CICLOS
        UPDATE public.sidebar_menu_items 
        SET url = '/crm/dashboards/ciclos', icon_name = 'ClockIcon', system_id = 'both', parent_id = v_crm_parent_id, name = 'ANÁLISE DE CICLOS'
        WHERE name ILIKE 'Análise de Ciclos' OR name ILIKE 'ANÁLISE DE CICLOS';

        -- GESTÃO DE LEADS
        UPDATE public.sidebar_menu_items 
        SET url = '/crm/leads', icon_name = 'UserPlusIcon', system_id = 'both', parent_id = v_crm_parent_id, name = 'GESTÃO DE LEADS'
        WHERE name ILIKE 'Gestão de Leads' OR name ILIKE 'GESTÃO DE LEADS';

        -- KANBAN DE LEADS
        UPDATE public.sidebar_menu_items 
        SET url = '/crm/kanban', icon_name = 'ViewColumnsIcon', system_id = 'both', parent_id = v_crm_parent_id, name = 'KANBAN DE LEADS'
        WHERE name ILIKE 'Kanban de Leads' OR name ILIKE 'KANBAN DE LEADS';

        -- CENTRAL DE MÍDIAS
        UPDATE public.sidebar_menu_items 
        SET url = '/crm/config/marketing', icon_name = 'MegaphoneIcon', system_id = 'both', parent_id = v_crm_parent_id, name = 'CENTRAL DE MÍDIAS'
        WHERE name ILIKE 'Central de Mídias' OR name ILIKE 'CENTRAL DE MÍDIAS';

        -- INTELIGÊNCIA ARTIFICIAL
        UPDATE public.sidebar_menu_items 
        SET url = '/crm/config/ia', icon_name = 'SparklesIcon', system_id = 'both', parent_id = v_crm_parent_id, name = 'INTELIGENCIA ARTIFICIAL'
        WHERE name ILIKE 'Inteligência Artificial' OR name ILIKE 'INTELIGENCIA ARTIFICIAL';
        
        -- SEGMENT BUILDER (ex-'Segmentos')
        UPDATE public.sidebar_menu_items 
        SET url = '/crm/config/segmentos', icon_name = 'Squares2X2Icon', system_id = 'both', parent_id = v_crm_parent_id, name = 'SEGMENT BUILDER'
        WHERE name ILIKE 'Segment Builder' OR name ILIKE 'Segmentos' OR name ILIKE 'Configurar Segmentos';

        -- 3. Desativar ou Limpar o "Configurações do CRM" se estiver vazio ou duplicado
        UPDATE public.sidebar_menu_items SET is_active = false WHERE name ILIKE 'Configurações do CRM' AND id != v_crm_parent_id;

        -- 4. Garantir que o Dashboard ROI também esteja lá
        UPDATE public.sidebar_menu_items 
        SET url = '/crm', icon_name = 'ChartBarIcon', system_id = 'both', parent_id = v_crm_parent_id, name = 'DASHBOARD ROI'
        WHERE name ILIKE 'Dashboard ROI' OR name ILIKE 'DASHBOARD DE ROI CRM';
        
    END IF;
END $$;

COMMIT;

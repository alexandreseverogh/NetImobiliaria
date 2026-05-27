-- [1] CADASTRAR A FUNCIONALIDADE
INSERT INTO public.system_features (name, slug, category_id, description, url, is_active, is_default_tenant_admin_feature)
VALUES (
    'Segment Builder (Configurador de Metadados)', 
    'crm-segment-builder', 
    19, 
    'Interface para configurar campos dinâmicos e badges visuais por segmento de mercado no CRM.',
    '/crm/config/segmentos',
    true,
    true
) RETURNING id;

-- [2] VINCULAR AO MÓDULO CRM DE VENDAS
-- (Substituir o ID da feature pelo retornado acima, ou usar subquery)
INSERT INTO public.system_feature_modules (feature_id, module_id)
SELECT id, 'a5e8f2df-f47f-400c-b33e-6820b9c8f6b1'::uuid 
FROM public.system_features WHERE slug = 'crm-segment-builder';

-- [3] ADICIONAR NA SIDEBAR (Debaixo de Configurações CRM - ID 72)
INSERT INTO public.sidebar_menu_items (name, url, icon_name, order_index, parent_id, system_id, is_active, permission_required, feature_id)
SELECT 
    'Configurar Segmentos', 
    '/crm/config/segmentos', 
    'Squares2X2Icon', 
    10, 
    72, 
    'admin', 
    true, 
    'crm-segment-builder',
    id
FROM public.system_features WHERE slug = 'crm-segment-builder';

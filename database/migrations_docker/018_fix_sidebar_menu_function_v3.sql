-- 018_fix_sidebar_menu_function_v3.sql
-- Melhora a função get_sidebar_menu_for_user para permitir itens pai sem feature_id
-- e garantir que Super Admin veja tudo.

CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(p_user_id uuid)
RETURNS TABLE(
    id integer, 
    parent_id integer, 
    name character varying, 
    icon_name character varying, 
    url character varying, 
    order_index integer, 
    has_permission boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_super_admin boolean;
BEGIN
    -- 1. Verificar se é Super Admin (sempre tem acesso total)
    SELECT EXISTS (
        SELECT 1 FROM public.user_role_assignments ura
        JOIN public.user_roles ur ON ura.role_id = ur.id
        WHERE ura.user_id = p_user_id AND ur.name = 'Super Admin'
    ) INTO v_is_super_admin;

    RETURN QUERY
    SELECT 
        smi.id,
        smi.parent_id,
        smi.name,
        smi.icon_name,
        smi.url,
        smi.order_index,
        CASE
            -- Regra 1: Super Admin tem acesso a tudo
            WHEN v_is_super_admin THEN true
            
            -- Regra 2: Item com feature_id específica - verificar permissão explícita
            WHEN smi.feature_id IS NOT NULL THEN
                EXISTS (
                    SELECT 1 
                    FROM public.role_permissions rp
                    JOIN public.user_role_assignments ura ON rp.role_id = ura.role_id
                    JOIN public.permissions p ON rp.permission_id = p.id
                    WHERE ura.user_id = p_user_id
                    AND p.feature_id = smi.feature_id
                )
            
            -- Regra 3: Item sem feature_id mas que é RAIZ (Pai)
            -- Permitir exibição (o frontend filtrará se ele não tiver filhos visíveis)
            -- Isso resolve o problema de categorias/agrupadores criados na interface
            WHEN smi.feature_id IS NULL AND smi.parent_id IS NULL THEN true
            
            -- Regra 4: Outros casos sem feature_id (denegar por segurança)
            ELSE false
        END as has_permission
    FROM public.sidebar_menu_items smi
    WHERE smi.is_active = true
    ORDER BY smi.order_index, smi.id;
END;
$$;

COMMENT ON FUNCTION public.get_sidebar_menu_for_user(uuid) IS 'V3: Permite Super Admin ver tudo e libera itens raiz (agrupadores) sem feature_id.';



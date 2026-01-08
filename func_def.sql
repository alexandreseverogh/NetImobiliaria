CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(p_user_id uuid)
 RETURNS TABLE(id integer, parent_id integer, name character varying, icon_name character varying, url character varying, order_index integer, has_permission boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        smi.id,
        smi.parent_id,
        smi.name,
        smi.icon_name,
        smi.url,
        smi.order_index,
        CASE
            -- Item com feature_id específica: verificar permissão específica
            WHEN smi.feature_id IS NOT NULL THEN
                EXISTS (
                    SELECT 1 
                    FROM role_permissions rp
                    JOIN user_role_assignments ura ON rp.role_id = ura.role_id
                    JOIN permissions p ON rp.permission_id = p.id
                    WHERE ura.user_id = p_user_id
                    AND p.feature_id = smi.feature_id
                )
            -- Item sem feature_id: NEGAR acesso por padrão
            -- Só permitir se explicitamente configurado
            WHEN smi.feature_id IS NULL THEN false
            ELSE false
        END as has_permission
    FROM sidebar_menu_items smi
    WHERE smi.is_active = true
    ORDER BY smi.order_index;
END;
$function$

CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(p_user_id uuid, p_system_id text DEFAULT 'admin'::text)
 RETURNS TABLE(id integer, parent_id integer, name character varying, icon_name character varying, url character varying, resource character varying, order_index integer, is_active boolean, roles_required jsonb, permission_required character varying, permission_action character varying, description text, has_permission boolean)
 LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH user_permissions AS (
        -- Pegar todas as permissões do usuário através de seus papéis (roles)
        SELECT DISTINCT p.action, sc.slug as resource
        FROM public.user_role_assignments ura
        JOIN public.role_permissions rp ON ura.role_id = rp.role_id
        JOIN public.permissions p ON rp.permission_id = p.id
        JOIN public.system_features sf ON p.feature_id = sf.id
        LEFT JOIN public.system_categorias sc ON sf.category_id = sc.id
        WHERE ura.user_id = p_user_id
    ),
    user_roles AS (
        -- Pegar todos os papéis do usuário
        SELECT role_id FROM public.user_role_assignments WHERE user_id = p_user_id
    )
    SELECT 
        smi.id,
        smi.parent_id,
        smi.name,
        smi.icon_name,
        smi.url,
        smi.resource,
        smi.order_index,
        smi.is_active,
        smi.roles_required,
        smi.permission_required,
        smi.permission_action,
        smi.description,
        CASE 
            -- Se não requer permissão específica, é visível
            WHEN smi.permission_required IS NULL THEN true
            -- Se requer, verificar se o usuário tem a permissão exata
            WHEN EXISTS (
                SELECT 1 FROM user_permissions up 
                WHERE up.resource = smi.permission_required 
                AND up.action = COALESCE(smi.permission_action, 'read')
            ) THEN true
            -- Fallback para Super Admin (Role ID 1) sempre ver tudo da gerência
            WHEN EXISTS (SELECT 1 FROM user_roles ur WHERE ur.role_id = 1) THEN true
            ELSE false
        END as has_permission
    FROM public.sidebar_menu_items smi
    WHERE smi.is_active = true
      AND (smi.system_id = p_system_id OR smi.system_id IS NULL)
      AND (
          -- Filtro adicional por role_id na tabela de ligação sidebar_item_roles
          -- Se não houver restrição na tabela, assume-se visível (se has_permission for true)
          NOT EXISTS (SELECT 1 FROM public.sidebar_item_roles sir_check WHERE sir_check.sidebar_item_id = smi.id)
          OR 
          EXISTS (
              SELECT 1 FROM public.sidebar_item_roles sir 
              JOIN user_roles ur ON sir.role_id = ur.role_id 
              WHERE sir.sidebar_item_id = smi.id
          )
      )
    ORDER BY smi.parent_id NULLS FIRST, smi.order_index ASC;
END;
$$;

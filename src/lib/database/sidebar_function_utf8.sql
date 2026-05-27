 CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(p_user_id uuid, p_system_id text DEFAULT 'admin'::text, p_tenant_id uuid DEFAULT NULL::uuid)                            +
  RETURNS jsonb                                                                                                                                                                      +
  LANGUAGE plpgsql                                                                                                                                                                   +
  SECURITY DEFINER                                                                                                                                                                   +
 AS $function$                                                                                                                                                                       +
 DECLARE                                                                                                                                                                             +
     v_is_master BOOLEAN;                                                                                                                                                            +
     v_menu JSONB;                                                                                                                                                                   +
 BEGIN                                                                                                                                                                               +
     SELECT EXISTS (                                                                                                                                                                 +
         SELECT 1 FROM public.user_role_assignments ura                                                                                                                              +
         JOIN public.user_roles ur ON ura.role_id = ur.id                                                                                                                            +
         WHERE ura.user_id = p_user_id AND ur.is_system_role = true                                                                                                                  +
         UNION                                                                                                                                                                       +
         SELECT 1 FROM public.user_tenant_membership utm                                                                                                                             +
         JOIN public.user_roles ur ON utm.role_id = ur.id                                                                                                                            +
         WHERE utm.user_id = p_user_id AND ur.is_system_role = true                                                                                                                  +
     ) INTO v_is_master;                                                                                                                                                             +
                                                                                                                                                                                     +
     WITH permitted_features AS (                                                                                                                                                    +
         SELECT DISTINCT                                                                                                                                                             +
             sf.id,                                                                                                                                                                  +
             sf.name,                                                                                                                                                                +
             sf.url,                                                                                                                                                                 +
             sf.category_id,                                                                                                                                                         +
             sf.icon,                                                                                                                                                                +
             COALESCE(sf.sort_order, 0) as feature_order                                                                                                                             +
         FROM public.system_features sf                                                                                                                                              +
         WHERE sf.is_active = true                                                                                                                                                   +
           AND (                                                                                                                                                                     +
             v_is_master = true OR                                                                                                                                                   +
             EXISTS (                                                                                                                                                                +
                 SELECT 1 FROM public.permissions p                                                                                                                                  +
                 JOIN public.role_permissions rp ON rp.permission_id = p.id                                                                                                          +
                 JOIN (                                                                                                                                                              +
                     SELECT role_id FROM public.user_role_assignments WHERE user_id = p_user_id                                                                                      +
                     UNION                                                                                                                                                           +
                     SELECT role_id FROM public.user_tenant_membership WHERE user_id = p_user_id AND (tenant_id = p_tenant_id OR p_tenant_id IS NULL)                                +
                 ) uar ON uar.role_id = rp.role_id                                                                                                                                   +
                 WHERE p.feature_id = sf.id                                                                                                                                          +
                   AND (LOWER(p.action) IN ('read', 'view', 'execute', 'visualizar', 'acessar'))                                                                                     +
             )                                                                                                                                                                       +
           )                                                                                                                                                                         +
           AND (                                                                                                                                                                     +
             v_is_master = true OR                                                                                                                                                   +
             p_tenant_id IS NULL OR                                                                                                                                                  +
             EXISTS (                                                                                                                                                                +
                 SELECT 1 FROM public.system_feature_modules fm                                                                                                                      +
                 JOIN public.tenant_modules tm ON fm.module_id = tm.module_id                                                                                                        +
                 WHERE fm.feature_id = sf.id AND tm.tenant_id = p_tenant_id AND tm.is_enabled = true                                                                                 +
             ) OR                                                                                                                                                                    +
             NOT EXISTS (SELECT 1 FROM public.system_feature_modules fm WHERE fm.feature_id = sf.id)                                                                                 +
           )                                                                                                                                                                         +
     ),                                                                                                                                                                              +
     category_structure AS (                                                                                                                                                         +
         SELECT                                                                                                                                                                      +
             sc.id as category_id,                                                                                                                                                   +
             sc.name as category_name,                                                                                                                                               +
             sc.icon as category_icon,                                                                                                                                               +
             COALESCE(sc.sort_order, 0) as category_order,                                                                                                                           +
             jsonb_agg(                                                                                                                                                              +
                 jsonb_build_object(                                                                                                                                                 +
                     'id', pf.id,                                                                                                                                                    +
                     'name', pf.name,                                                                                                                                                +
                     'path', pf.url,                                                                                                                                                 +
                     'icon', COALESCE(pf.icon, 'default')                                                                                                                            +
                 ) ORDER BY pf.feature_order, pf.name                                                                                                                                +
             ) as children                                                                                                                                                           +
         FROM public.system_categorias sc                                                                                                                                            +
         JOIN permitted_features pf ON pf.category_id = sc.id                                                                                                                        +
         WHERE sc.is_active = true                                                                                                                                                   +
           AND (                                                                                                                                                                     +
             v_is_master = true OR                                                                                                                                                   +
             (sc.module_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.tenant_modules tm WHERE tm.module_id = sc.module_id AND tm.tenant_id = p_tenant_id AND tm.is_enabled = true))+
           )                                                                                                                                                                         +
         GROUP BY sc.id, sc.name, sc.icon, sc.sort_order                                                                                                                             +
     )                                                                                                                                                                               +
     SELECT                                                                                                                                                                          +
         jsonb_agg(                                                                                                                                                                  +
             jsonb_build_object(                                                                                                                                                     +
                 'id', category_id,                                                                                                                                                  +
                 'name', category_name,                                                                                                                                              +
                 'icon', category_icon,                                                                                                                                              +
                 'children', children                                                                                                                                                +
             ) ORDER BY category_order, category_name                                                                                                                                +
         )                                                                                                                                                                           +
     INTO v_menu                                                                                                                                                                     +
     FROM category_structure;                                                                                                                                                        +
                                                                                                                                                                                     +
     RETURN COALESCE(v_menu, '[]'::jsonb);                                                                                                                                           +
 END;                                                                                                                                                                                +
 $function$                                                                                                                                                                          +
 


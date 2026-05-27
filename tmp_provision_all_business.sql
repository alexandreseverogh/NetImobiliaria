DO $$ 
DECLARE 
    v_master_tenant_id UUID;
    v_user_record RECORD;
BEGIN
    -- 1. Criar o Tenant Master se não existir
    INSERT INTO public.tenants (name, slug, segment, status)
    VALUES ('All Business - Master Platform', 'all-business-master', 'master', 'active')
    ON CONFLICT (name) DO UPDATE SET slug = EXCLUDED.slug
    RETURNING id INTO v_master_tenant_id;

    -- 2. Vincular usuários Super Admin a este Tenant na tabela de bridge
    FOR v_user_record IN 
        SELECT id FROM public.users WHERE username IN ('admin', 'admin123')
    LOOP
        INSERT INTO public.user_tenant_membership (user_id, tenant_id, role_id, is_active, is_owner)
        VALUES (v_user_record.id, v_master_tenant_id, 1, true, true)
        ON CONFLICT (user_id, tenant_id) DO UPDATE SET is_active = true, role_id = 1;
    END LOOP;

    RAISE NOTICE 'Vinculação Master [All Business] concluída via Bridge.';
END $$;

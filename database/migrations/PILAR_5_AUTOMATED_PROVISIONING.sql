
-- ==============================================================================
-- PILLAR 5: AUTOMATED PROVISIONING & MODULE SECURITY
-- Descrição: Automação da concessão de permissões ao Admin quando um módulo é habilitado.
-- ==============================================================================

BEGIN;

-- 1. Tabela de Relacionamento Feature-Módulo (Se não existir)
-- Isso permite saber quais features pertencem a quais módulos.
CREATE TABLE IF NOT EXISTS public.system_feature_modules (
    feature_id INTEGER REFERENCES public.system_features(id) ON DELETE CASCADE,
    module_id UUID REFERENCES public.system_modules(id) ON DELETE CASCADE,
    PRIMARY KEY (feature_id, module_id)
);

-- 2. Alimentar system_feature_modules baseado no slug/categoria (Heurística Inicial)
-- Nota: Isso deve ser refinado conforme novas features são criadas.
INSERT INTO public.system_feature_modules (feature_id, module_id)
SELECT f.id, m.id
FROM public.system_features f, public.system_modules m
WHERE (
    (m.slug = 'crm' AND (f.slug ILIKE '%crm%' OR f.slug IN ('imoveis', 'clientes', 'proprietarios', 'leads', 'vendas', 'agenda'))) OR
    (m.slug = 'admin' AND (f.slug IN ('usuarios', 'perfis', 'configuracoes', 'logs', 'seguranca', 'financeiro', 'dashboard'))) OR
    (m.slug = 'landpaging' AND (f.slug ILIKE '%landpaging%' OR f.slug IN ('landing-pages', 'marketing', 'captura')))
)
ON CONFLICT DO NOTHING;

-- 3. Função de Trigger para Provisionamento Automático
CREATE OR REPLACE FUNCTION public.provision_tenant_module_permissions_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_feature_id INTEGER;
    v_action TEXT;
    v_permission_id INTEGER;
    v_admin_role_id INTEGER := 42; -- Role ID para Administrador (Padrão Pilar 1)
BEGIN
    -- Se o módulo foi habilitado
    IF (TG_OP = 'INSERT' AND NEW.is_enabled = true) OR 
       (TG_OP = 'UPDATE' AND NEW.is_enabled = true AND OLD.is_enabled = false) THEN
        
        -- Log de início
        RAISE NOTICE '🚀 Provisionando permissões para Tenant % - Módulo %', NEW.tenant_id, NEW.module_id;

        -- Loop em todas as features vinculadas ao módulo
        FOR v_feature_id IN 
            SELECT feature_id FROM public.system_feature_modules WHERE module_id = NEW.module_id
        LOOP
            -- Loop nas ações padrão: read, write, delete, admin
            -- Nota: Usamos as ações em minúsculo conforme padrão detectado no banco (read, write, delete, admin)
            FOR v_action IN SELECT unnest(ARRAY['read', 'write', 'delete', 'admin'])
            LOOP
                -- 3.1 Garantir que a permissão existe na tabela 'permissions'
                -- Se não existir, criamos (healtcheck)
                INSERT INTO public.permissions (feature_id, action)
                VALUES (v_feature_id, v_action)
                ON CONFLICT (feature_id, action) DO NOTHING;

                -- Pegar o ID da permissão
                SELECT id INTO v_permission_id FROM public.permissions 
                WHERE feature_id = v_feature_id AND action = v_action;

                -- 3.2 Vincular à Role de Admin no tenant
                -- Como a Role 42 é o "molde" de admin, garantimos que ela tenha essas permissões.
                -- Nota: Nosso sistema atual de role_permissions não tem tenant_id (confirmado no create-all-tables.sql)
                -- Isso significa que Role 42 é uma Role Compartilhada (Global Admin Template).
                -- Se quisermos isolamento total, o check de permissão DEVE verificar tenant_modules.
                
                INSERT INTO public.role_permissions (role_id, permission_id)
                VALUES (v_admin_role_id, v_permission_id)
                ON CONFLICT (role_id, permission_id) DO NOTHING;
            END LOOP;
        END LOOP;
        
        RAISE NOTICE '✅ Provisionamento concluído para Módulo %', NEW.module_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Criar o Trigger
DROP TRIGGER IF EXISTS trg_provision_tenant_module_permissions ON public.tenant_modules;
CREATE TRIGGER trg_provision_tenant_module_permissions
AFTER INSERT OR UPDATE ON public.tenant_modules
FOR EACH ROW EXECUTE FUNCTION public.provision_tenant_module_permissions_trigger();

-- 5. Executar provisionamento retroativo para módulos já habilitados
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT tenant_id, module_id FROM public.tenant_modules WHERE is_enabled = true
    LOOP
        -- Simulamos um "update" para disparar a lógica manual (ou chamamos a função se fosse separada)
        -- Mas aqui chamamos a lógica da função diretamente para garantir.
        PERFORM public.provision_tenant_module_permissions_trigger_logic(r.tenant_id, r.module_id);
    END LOOP;
END $$;

-- Criar versão 'manual' da função para facilitar chamadas externas e retroativas
CREATE OR REPLACE FUNCTION public.provision_tenant_module_permissions_manual(p_tenant_id UUID, p_module_id UUID)
RETURNS VOID AS $$
DECLARE
    v_feature_id INTEGER;
    v_action TEXT;
    v_permission_id INTEGER;
    v_admin_role_id INTEGER := 42;
BEGIN
    FOR v_feature_id IN 
        SELECT feature_id FROM public.system_feature_modules WHERE module_id = p_module_id
    LOOP
        FOR v_action IN SELECT unnest(ARRAY['read', 'write', 'delete', 'admin'])
        LOOP
            INSERT INTO public.permissions (feature_id, action)
            VALUES (v_feature_id, v_action)
            ON CONFLICT (feature_id, action) DO NOTHING;

            SELECT id INTO v_permission_id FROM public.permissions 
            WHERE feature_id = v_feature_id AND action = v_action;

            INSERT INTO public.role_permissions (role_id, permission_id)
            VALUES (v_admin_role_id, v_permission_id)
            ON CONFLICT (role_id, permission_id) DO NOTHING;
        END LOOP;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMIT;

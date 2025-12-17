-- ============================================================
-- ADICIONAR FOREIGN KEYS EXPLÍCITAS PARA ROBUSTEZ
-- Refatoração: Sidebar e Permissões
-- Data: 26/10/2025
-- ============================================================

-- =========================================
-- 1. ADICIONAR FOREIGN KEYS
-- =========================================

ALTER TABLE sidebar_menu_items
ADD COLUMN IF NOT EXISTS feature_id INTEGER REFERENCES system_features(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS permission_id INTEGER REFERENCES permissions(id) ON DELETE SET NULL;

-- =========================================
-- 2. CRIAR VIEW PARA CONSULTAS
-- =========================================

CREATE OR REPLACE VIEW sidebar_menu_with_permissions AS
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
    smi.created_at,
    smi.updated_at,
    
    -- Dados de system_features
    smi.feature_id,
    sf.name as feature_name,
    sf.description as feature_description,
    sf.url as feature_url,
    sf.is_active as feature_is_active,
    
    -- Dados de permissions
    smi.permission_id,
    p.action as permission_action_name,
    p.description as permission_description
    
FROM sidebar_menu_items smi
LEFT JOIN system_features sf ON smi.feature_id = sf.id
LEFT JOIN permissions p ON smi.permission_id = p.id
WHERE smi.is_active = true;

-- =========================================
-- 3. ÍNDICES PARA PERFORMANCE
-- =========================================

CREATE INDEX IF NOT EXISTS idx_sidebar_menu_items_feature_id 
    ON sidebar_menu_items(feature_id);
    
CREATE INDEX IF NOT EXISTS idx_sidebar_menu_items_permission_id 
    ON sidebar_menu_items(permission_id);

-- =========================================
-- 4. FUNÇÃO HELPER: BUSCAR MENU DO USUÁRIO
-- =========================================

CREATE OR REPLACE FUNCTION get_sidebar_menu_for_user(p_user_id UUID)
RETURNS TABLE (
    id INTEGER,
    parent_id INTEGER,
    name VARCHAR,
    icon_name VARCHAR,
    url VARCHAR,
    order_index INTEGER,
    has_permission BOOLEAN
) AS $$
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
            WHEN smi.feature_id IS NULL THEN true -- Sem feature associada
            WHEN EXISTS (
                SELECT 1 
                FROM role_permissions rp
                JOIN user_role_assignments ura ON rp.role_id = ura.role_id
                WHERE ura.user_id = p_user_id
                AND rp.permission_id = smi.permission_id
            ) THEN true
            ELSE false
        END as has_permission
    FROM sidebar_menu_items smi
    WHERE smi.is_active = true
    ORDER BY smi.order_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- 5. FUNÇÃO HELPER: VALIDAR PERMISSÃO
-- =========================================

CREATE OR REPLACE FUNCTION check_menu_permission(
    p_user_id UUID,
    p_menu_item_id INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
    v_permission_id INTEGER;
    v_has_permission BOOLEAN := false;
BEGIN
    -- Buscar permission_id do item
    SELECT permission_id INTO v_permission_id
    FROM sidebar_menu_items
    WHERE id = p_menu_item_id;
    
    -- Se não tem permission associada, permite acesso
    IF v_permission_id IS NULL THEN
        RETURN true;
    END IF;
    
    -- Verificar se usuário tem a permissão via role
    SELECT EXISTS (
        SELECT 1 
        FROM role_permissions rp
        JOIN user_role_assignments ura ON rp.role_id = ura.role_id
        WHERE ura.user_id = p_user_id
        AND rp.permission_id = v_permission_id
    ) INTO v_has_permission;
    
    RETURN v_has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =========================================
-- 6. TRIGGER: VALIDAR INTEGRIDADE
-- =========================================

CREATE OR REPLACE FUNCTION validate_sidebar_menu_item()
RETURNS TRIGGER AS $$
BEGIN
    -- Se tem permission_id, deve ter feature_id
    IF NEW.permission_id IS NOT NULL AND NEW.feature_id IS NULL THEN
        RAISE EXCEPTION 'Se tem permission_id, deve ter feature_id também';
    END IF;
    
    -- Se tem feature_id, verificar se existe
    IF NEW.feature_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM system_features WHERE id = NEW.feature_id) THEN
            RAISE EXCEPTION 'Feature_id não existe';
        END IF;
    END IF;
    
    -- Se tem permission_id, verificar se existe
    IF NEW.permission_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM permissions WHERE id = NEW.permission_id) THEN
            RAISE EXCEPTION 'Permission_id não existe';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_validate_sidebar_menu_item
    BEFORE INSERT OR UPDATE ON sidebar_menu_items
    FOR EACH ROW
    EXECUTE FUNCTION validate_sidebar_menu_item();

-- =========================================
-- 7. GRANT PERMISSIONS (SE NECESSÁRIO)
-- =========================================

-- Dar acesso às funções para app user
-- GRANT EXECUTE ON FUNCTION get_sidebar_menu_for_user(UUID) TO app_user;
-- GRANT EXECUTE ON FUNCTION check_menu_permission(UUID, INTEGER) TO app_user;
-- GRANT SELECT ON sidebar_menu_with_permissions TO app_user;

-- =========================================
-- PRONTO!
-- =========================================

COMMENT ON VIEW sidebar_menu_with_permissions IS 'View que combina sidebar, features e permissions';
COMMENT ON FUNCTION get_sidebar_menu_for_user(UUID) IS 'Retorna menu do usuário com validação de permissões';
COMMENT ON FUNCTION check_menu_permission(UUID, INTEGER) IS 'Valida se usuário tem permissão para acessar item do menu';

-- ============================================================
-- CORRIGIR PERMISSÕES DO USUÁRIO ADMIN
-- Garantir que admin/admin@123 tenha acesso completo
-- ============================================================

-- 1. VERIFICAR USUÁRIO ADMIN E SEU ROLE
SELECT 
    u.id,
    u.username,
    u.email,
    ur.id as role_id,
    ur.name as role_name,
    ur.is_active as role_is_active,
    ur.level
FROM users u
LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
LEFT JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin' OR u.email = 'admin@123';

-- 2. GARANTIR QUE O ROLE DO ADMIN ESTÁ ATIVO (SEM FILTRO is_active)
UPDATE user_roles 
SET is_active = true
WHERE id IN (
    SELECT ura.role_id 
    FROM users u 
    JOIN user_role_assignments ura ON u.id = ura.user_id
    WHERE u.username = 'admin' OR u.email = 'admin@123'
);

-- 3. VERIFICAR SE ADMIN TEM TODAS AS PERMISSÕES NECESSÁRIAS
-- Buscar o role_id do admin
DO $$
DECLARE
    admin_role_id INTEGER;
    admin_user_id UUID;  -- Changed to UUID
BEGIN
    -- Buscar user_id do admin
    SELECT id INTO admin_user_id
    FROM users u
    WHERE u.username = 'admin' OR u.email = 'admin@123';
    
    -- Buscar role_id do admin (verificar se is_active existe, senão usar sem filtro)
    SELECT ura.role_id INTO admin_role_id
    FROM user_role_assignments ura
    WHERE ura.user_id = admin_user_id
    LIMIT 1;
    
    IF admin_role_id IS NOT NULL THEN
        -- Garantir que o role está ativo
        UPDATE user_roles 
        SET is_active = true,
            requires_2fa = false
        WHERE id = admin_role_id;
        
        RAISE NOTICE 'Role do admin ativado: ID %', admin_role_id;
    ELSE
        RAISE NOTICE 'ERRO: Usuário admin não encontrado ou sem role atribuído';
    END IF;
END $$;

-- 4. VERIFICAR SE TABELA USER_ROLES TEM TODAS AS COLUNAS NECESSÁRIAS
DO $$
BEGIN
    -- Adicionar is_active se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_roles' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE user_roles ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Coluna is_active adicionada';
    END IF;
    
    -- Adicionar requires_2fa se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_roles' AND column_name = 'requires_2fa'
    ) THEN
        ALTER TABLE user_roles ADD COLUMN requires_2fa BOOLEAN DEFAULT false;
        RAISE NOTICE 'Coluna requires_2fa adicionada';
    END IF;
    
    -- Adicionar is_system_role se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_roles' AND column_name = 'is_system_role'
    ) THEN
        ALTER TABLE user_roles ADD COLUMN is_system_role BOOLEAN DEFAULT false;
        RAISE NOTICE 'Coluna is_system_role adicionada';
    END IF;
    
    -- Marcar todos como ativos por padrão
    UPDATE user_roles SET is_active = true WHERE is_active IS NULL;
    UPDATE user_roles SET requires_2fa = false WHERE requires_2fa IS NULL;
    UPDATE user_roles SET is_system_role = false WHERE is_system_role IS NULL;
END $$;

-- 5. VERIFICAR RESULTADO FINAL
SELECT 
    u.id,
    u.username,
    u.email,
    u.is_active as user_is_active,
    ura.id as assignment_id,
    ur.id as role_id,
    ur.name as role_name,
    ur.level as role_level,
    ur.is_active as role_is_active,
    ur.requires_2fa as role_requires_2fa,
    ur.is_system_role as role_is_system
FROM users u
LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
LEFT JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin' OR u.email = 'admin@123';

-- 6. VERIFICAR TODAS AS SESSÕES DO ADMIN E DESTRUÍ-LAS
DO $$
BEGIN
    DELETE FROM user_sessions 
    WHERE user_id IN (
        SELECT id FROM users 
        WHERE username = 'admin' OR email = 'admin@123'
    );
    
    RAISE NOTICE 'Sessões antigas do admin foram removidas';
END $$;

-- 7. VERIFICAR ROLES QUE PODEM ESTAR COM PROBLEMAS
SELECT 
    id,
    name,
    level,
    is_active,
    requires_2fa,
    is_system_role,
    CASE 
        WHEN is_active = false THEN 'ERRO: Role inativo'
        WHEN level IS NULL THEN 'ERRO: Level NULL'
        WHEN level < 1 OR level > 10 THEN 'ERRO: Level inválido'
        ELSE 'OK'
    END as status
FROM user_roles
ORDER BY id;

-- ============================================================
-- CORRIGIR LOGIN DO ADMIN
-- Versão genérica que funciona com qualquer tipo de user_id
-- ============================================================

-- 1. VERIFICAR ESTRUTURA DO USUÁRIO ADMIN
SELECT 
    u.id,
    u.username,
    u.email,
    pg_typeof(u.id) as id_type
FROM users u
WHERE u.username = 'admin' OR u.email = 'admin@123';

-- 2. VERIFICAR SE TEM ASSIGNMENT DE ROLE
SELECT 
    u.id,
    u.username,
    ura.id as assignment_id,
    ura.role_id,
    ur.name as role_name,
    ur.is_active as role_is_active
FROM users u
LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
LEFT JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin' OR u.email = 'admin@123';

-- 3. ATIVAR TODOS OS ROLES
UPDATE user_roles 
SET is_active = true,
    requires_2fa = false
WHERE id IN (SELECT DISTINCT role_id FROM user_role_assignments);

-- 4. VERIFICAR SE TABELA USER_ROLES TEM COLUNAS NECESSÁRIAS
DO $$
BEGIN
    -- Adicionar is_active se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_roles' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE user_roles ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
    
    -- Adicionar requires_2fa se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_roles' AND column_name = 'requires_2fa'
    ) THEN
        ALTER TABLE user_roles ADD COLUMN requires_2fa BOOLEAN DEFAULT false;
    END IF;
    
    -- Adicionar is_system_role se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_roles' AND column_name = 'is_system_role'
    ) THEN
        ALTER TABLE user_roles ADD COLUMN is_system_role BOOLEAN DEFAULT false;
    END IF;
    
    -- Atualizar valores NULL
    UPDATE user_roles SET is_active = true WHERE is_active IS NULL;
    UPDATE user_roles SET requires_2fa = false WHERE requires_2fa IS NULL;
    UPDATE user_roles SET is_system_role = false WHERE is_system_role IS NULL;
    
    RAISE NOTICE 'Colunas de user_roles verificadas e corrigidas';
END $$;

-- 5. GARANTIR QUE O ADMIN ESTÁ ATIVO E VERIFICADO
-- (Verifica se as colunas existem antes de usar)
DO $$
BEGIN
    -- Ativar usuário (se coluna existir)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_active'
    ) THEN
        UPDATE users 
        SET is_active = true
        WHERE username = 'admin' OR email = 'admin@123';
    END IF;
    
    -- Verificar email (se coluna existir)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'email_verified'
    ) THEN
        UPDATE users 
        SET email_verified = true
        WHERE username = 'admin' OR email = 'admin@123';
    END IF;
END $$;

-- 6. LIMPAR SESSÕES ANTIGAS
DELETE FROM user_sessions 
WHERE user_id IN (
    SELECT id FROM users 
    WHERE username = 'admin' OR email = 'admin@123'
);

-- 7. VERIFICAR RESULTADO FINAL
SELECT 
    u.id,
    u.username,
    u.email,
    ura.role_id,
    ur.name as role_name,
    ur.is_active as role_active,
    ur.level,
    ur.requires_2fa
FROM users u
LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
LEFT JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin' OR u.email = 'admin@123';

-- 8. VERIFICAR TODOS OS ROLES
SELECT 
    id,
    name,
    level,
    is_active,
    requires_2fa,
    is_system_role
FROM user_roles
ORDER BY id;


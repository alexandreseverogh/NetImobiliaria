-- ============================================================
-- CORRIGIR TABELA user_roles
-- Adicionar colunas faltantes: is_system_role, requires_2fa, is_active
-- ============================================================

-- 1. VERIFICAR COLUNAS ATUAIS
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_roles'
ORDER BY ordinal_position;

-- 2. ADICIONAR COLUNA is_system_role (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_roles' AND column_name = 'is_system_role'
    ) THEN
        ALTER TABLE user_roles ADD COLUMN is_system_role BOOLEAN DEFAULT false;
        RAISE NOTICE 'Coluna is_system_role adicionada';
    ELSE
        RAISE NOTICE 'Coluna is_system_role já existe';
    END IF;
END $$;

-- 3. ADICIONAR COLUNA is_active (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_roles' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE user_roles ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Coluna is_active adicionada';
    ELSE
        RAISE NOTICE 'Coluna is_active já existe';
    END IF;
END $$;

-- 4. VERIFICAR E RENOMEAR TWO_FA_REQUIRED ANTES DE ADICIONAR REQUIRES_2FA
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_roles' AND column_name = 'two_fa_required'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'user_roles' AND column_name = 'requires_2fa'
        ) THEN
            RAISE NOTICE 'Coluna two_fa_required encontrada - será renomeada para requires_2fa';
            ALTER TABLE user_roles RENAME COLUMN two_fa_required TO requires_2fa;
        ELSE
            RAISE NOTICE 'Coluna two_fa_required encontrada, mas requires_2fa já existe - remover two_fa_required';
            ALTER TABLE user_roles DROP COLUMN two_fa_required;
        END IF;
    END IF;
END $$;

-- 5. ADICIONAR COLUNA requires_2fa (se não existir)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_roles' AND column_name = 'requires_2fa'
    ) THEN
        ALTER TABLE user_roles ADD COLUMN requires_2fa BOOLEAN DEFAULT false;
        RAISE NOTICE 'Coluna requires_2fa adicionada';
    ELSE
        RAISE NOTICE 'Coluna requires_2fa já existe';
    END IF;
END $$;

-- 6. VERIFICAR COLUNAS APÓS ALTERAÇÕES
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_roles'
ORDER BY ordinal_position;

-- 7. ATUALIZAR ROLES EXISTENTES (marcar como ativos por padrão se is_active for NULL)
UPDATE user_roles SET is_active = true WHERE is_active IS NULL;
UPDATE user_roles SET is_system_role = false WHERE is_system_role IS NULL;
UPDATE user_roles SET requires_2fa = false WHERE requires_2fa IS NULL;

-- 8. EXIBIR RESULTADO FINAL
SELECT 
    id,
    name,
    level,
    is_system_role,
    requires_2fa,
    is_active,
    created_at
FROM user_roles
ORDER BY level, name;

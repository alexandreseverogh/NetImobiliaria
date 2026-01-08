-- 🔧 FIX USERS SCHEMA (Emergência)
-- Data: 06/01/2026
-- Objetivo: Criar colunas que o código espera mas não existem no banco atual.

-- 1. CPF (Usado no cadastro de corretor e login)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'cpf') THEN
        ALTER TABLE users ADD COLUMN cpf VARCHAR(20);
        CREATE UNIQUE INDEX idx_users_cpf ON users(cpf) WHERE cpf IS NOT NULL;
    END IF;
END $$;

-- 2. Colunas de Foto (Upload de avatar)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'foto') THEN
        ALTER TABLE users ADD COLUMN foto BYTEA;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'foto_tipo_mime') THEN
        ALTER TABLE users ADD COLUMN foto_tipo_mime VARCHAR(50);
    END IF;
END $$;

-- 3. Flags de Negócio (Isenção e Plantonista)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'isencao') THEN
        ALTER TABLE users ADD COLUMN isencao BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_plantonista') THEN
        ALTER TABLE users ADD COLUMN is_plantonista BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

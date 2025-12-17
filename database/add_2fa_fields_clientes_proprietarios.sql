-- ================================================================
-- SCRIPT: Adicionar Campos 2FA para Clientes e Proprietarios
-- Sistema: Net Imobiliaria - Autenticacao Publica
-- Data: 05/11/2025
-- Autor: Sistema Automatizado
-- ================================================================
-- 
-- OBJETIVO:
-- Adicionar campos necessarios para autenticacao 2FA nas tabelas
-- clientes e proprietarios, permitindo login seguro na area publica
--
-- ALTERACOES:
-- 1. Campo two_fa_enabled (BOOLEAN) - Controle de 2FA
-- 2. Indices em email para performance de login
-- 3. Comentarios de documentacao
--
-- ROLLBACK: Veja secao no final do arquivo
-- ================================================================

-- ================================================================
-- VERIFICACAO PREVIA
-- ================================================================

-- Verificar se as tabelas existem
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clientes') THEN
        RAISE EXCEPTION 'ERRO: Tabela clientes nao existe!';
    END IF;
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'proprietarios') THEN
        RAISE EXCEPTION 'ERRO: Tabela proprietarios nao existe!';
    END IF;
    
    RAISE NOTICE '[OK] Tabelas clientes e proprietarios existem';
END $$;

-- Verificar se campos password e email ja existem
DO $$
DECLARE
    clientes_password_exists BOOLEAN;
    clientes_email_exists BOOLEAN;
    proprietarios_password_exists BOOLEAN;
    proprietarios_email_exists BOOLEAN;
BEGIN
    -- Verificar clientes
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clientes' AND column_name = 'password'
    ) INTO clientes_password_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clientes' AND column_name = 'email'
    ) INTO clientes_email_exists;
    
    -- Verificar proprietarios
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'proprietarios' AND column_name = 'password'
    ) INTO proprietarios_password_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'proprietarios' AND column_name = 'email'
    ) INTO proprietarios_email_exists;
    
    -- Validar
    IF NOT clientes_password_exists THEN
        RAISE EXCEPTION 'ERRO: Campo password nao existe na tabela clientes!';
    END IF;
    
    IF NOT clientes_email_exists THEN
        RAISE EXCEPTION 'ERRO: Campo email nao existe na tabela clientes!';
    END IF;
    
    IF NOT proprietarios_password_exists THEN
        RAISE EXCEPTION 'ERRO: Campo password nao existe na tabela proprietarios!';
    END IF;
    
    IF NOT proprietarios_email_exists THEN
        RAISE EXCEPTION 'ERRO: Campo email nao existe na tabela proprietarios!';
    END IF;
    
    RAISE NOTICE '[OK] Campos password e email existem em ambas as tabelas';
END $$;

-- ================================================================
-- BACKUP: Criar tabelas de backup antes de alteracoes
-- ================================================================

-- Backup da estrutura de clientes (apenas estrutura, nao dados)
CREATE TABLE IF NOT EXISTS clientes_backup_estrutura_20251105 (LIKE clientes INCLUDING ALL);

-- Backup da estrutura de proprietarios (apenas estrutura, nao dados)
CREATE TABLE IF NOT EXISTS proprietarios_backup_estrutura_20251105 (LIKE proprietarios INCLUDING ALL);

-- Log de backup
DO $$
BEGIN
    RAISE NOTICE '[OK] Backup de estrutura criado: clientes_backup_estrutura_20251105';
    RAISE NOTICE '[OK] Backup de estrutura criado: proprietarios_backup_estrutura_20251105';
END $$;

-- ================================================================
-- ALTERACOES: TABELA CLIENTES
-- ================================================================

-- 1. Adicionar campo two_fa_enabled se nao existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'clientes' AND column_name = 'two_fa_enabled'
    ) THEN
        ALTER TABLE clientes ADD COLUMN two_fa_enabled BOOLEAN DEFAULT true;
        RAISE NOTICE '[OK] Campo two_fa_enabled adicionado na tabela clientes';
    ELSE
        RAISE NOTICE '[AVISO] Campo two_fa_enabled ja existe na tabela clientes - pulando';
    END IF;
END $$;

-- 2. Criar indice em email se nao existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'clientes' AND indexname = 'idx_clientes_email'
    ) THEN
        CREATE INDEX idx_clientes_email ON clientes(email);
        RAISE NOTICE '[OK] Indice idx_clientes_email criado';
    ELSE
        RAISE NOTICE '[AVISO] Indice idx_clientes_email ja existe - pulando';
    END IF;
END $$;

-- 3. Adicionar comentarios de documentacao
COMMENT ON COLUMN clientes.two_fa_enabled IS 
'Indica se autenticacao de dois fatores esta habilitada para este cliente. Default: true (habilitado por padrao para seguranca)';

COMMENT ON COLUMN clientes.email IS 
'Email do cliente - usado para login na area publica e recebimento de codigo 2FA. Deve ser unico.';

COMMENT ON COLUMN clientes.password IS 
'Senha hash do cliente gerada com bcrypt (12 rounds). Nunca armazenar senha em texto plano.';

-- ================================================================
-- ALTERACOES: TABELA PROPRIETARIOS
-- ================================================================

-- 1. Adicionar campo two_fa_enabled se nao existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'proprietarios' AND column_name = 'two_fa_enabled'
    ) THEN
        ALTER TABLE proprietarios ADD COLUMN two_fa_enabled BOOLEAN DEFAULT true;
        RAISE NOTICE '[OK] Campo two_fa_enabled adicionado na tabela proprietarios';
    ELSE
        RAISE NOTICE '[AVISO] Campo two_fa_enabled ja existe na tabela proprietarios - pulando';
    END IF;
END $$;

-- 2. Criar indice em email se nao existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'proprietarios' AND indexname = 'idx_proprietarios_email'
    ) THEN
        CREATE INDEX idx_proprietarios_email ON proprietarios(email);
        RAISE NOTICE '[OK] Indice idx_proprietarios_email criado';
    ELSE
        RAISE NOTICE '[AVISO] Indice idx_proprietarios_email ja existe - pulando';
    END IF;
END $$;

-- 3. Adicionar comentarios de documentacao
COMMENT ON COLUMN proprietarios.two_fa_enabled IS 
'Indica se autenticacao de dois fatores esta habilitada para este proprietario. Default: true (habilitado por padrao para seguranca)';

COMMENT ON COLUMN proprietarios.email IS 
'Email do proprietario - usado para login na area publica e recebimento de codigo 2FA. Deve ser unico.';

COMMENT ON COLUMN proprietarios.password IS 
'Senha hash do proprietario gerada com bcrypt (12 rounds). Nunca armazenar senha em texto plano.';

-- ================================================================
-- VERIFICACAO POS-ALTERACOES
-- ================================================================

-- Verificar campos adicionados em clientes
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'VERIFICACAO: Estrutura da tabela CLIENTES';
    RAISE NOTICE '================================================';
    
    FOR rec IN 
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'clientes' 
          AND column_name IN ('id', 'email', 'password', 'two_fa_enabled')
        ORDER BY 
            CASE column_name 
                WHEN 'id' THEN 1
                WHEN 'email' THEN 2
                WHEN 'password' THEN 3
                WHEN 'two_fa_enabled' THEN 4
            END
    LOOP
        RAISE NOTICE 'Campo: % | Tipo: % | Nullable: % | Default: %', 
            rec.column_name, rec.data_type, rec.is_nullable, COALESCE(rec.column_default, 'NULL');
    END LOOP;
END $$;

-- Verificar campos adicionados em proprietarios
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'VERIFICACAO: Estrutura da tabela PROPRIETARIOS';
    RAISE NOTICE '================================================';
    
    FOR rec IN 
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'proprietarios' 
          AND column_name IN ('id', 'email', 'password', 'two_fa_enabled')
        ORDER BY 
            CASE column_name 
                WHEN 'id' THEN 1
                WHEN 'email' THEN 2
                WHEN 'password' THEN 3
                WHEN 'two_fa_enabled' THEN 4
            END
    LOOP
        RAISE NOTICE 'Campo: % | Tipo: % | Nullable: % | Default: %', 
            rec.column_name, rec.data_type, rec.is_nullable, COALESCE(rec.column_default, 'NULL');
    END LOOP;
END $$;

-- Verificar indices criados
DO $$
DECLARE
    rec RECORD;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'VERIFICACAO: Indices criados';
    RAISE NOTICE '================================================';
    
    FOR rec IN 
        SELECT tablename, indexname, indexdef
        FROM pg_indexes
        WHERE tablename IN ('clientes', 'proprietarios')
          AND indexname IN ('idx_clientes_email', 'idx_proprietarios_email')
        ORDER BY tablename, indexname
    LOOP
        RAISE NOTICE 'Tabela: % | Indice: %', rec.tablename, rec.indexname;
        RAISE NOTICE '  SQL: %', rec.indexdef;
    END LOOP;
END $$;

-- Contar registros existentes (sem alterar dados)
DO $$
DECLARE
    clientes_count INTEGER;
    proprietarios_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO clientes_count FROM clientes;
    SELECT COUNT(*) INTO proprietarios_count FROM proprietarios;
    
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'ESTATISTICAS: Registros existentes';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Total de clientes: %', clientes_count;
    RAISE NOTICE 'Total de proprietarios: %', proprietarios_count;
    RAISE NOTICE '';
    RAISE NOTICE 'NOTA: Nenhum registro foi modificado ou deletado';
    RAISE NOTICE 'NOTA: Apenas estrutura da tabela foi alterada';
END $$;

-- ================================================================
-- RELATORIO FINAL
-- ================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '[SUCESSO] ALTERACOES CONCLUIDAS COM SUCESSO!';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Alteracoes realizadas:';
    RAISE NOTICE '  1. Campo two_fa_enabled adicionado em clientes';
    RAISE NOTICE '  2. Campo two_fa_enabled adicionado em proprietarios';
    RAISE NOTICE '  3. Indice idx_clientes_email criado';
    RAISE NOTICE '  4. Indice idx_proprietarios_email criado';
    RAISE NOTICE '  5. Comentarios de documentacao adicionados';
    RAISE NOTICE '';
    RAISE NOTICE 'Proximos passos:';
    RAISE NOTICE '  - Criar APIs de autenticacao publica';
    RAISE NOTICE '  - Criar componentes de interface';
    RAISE NOTICE '  - Implementar fluxo de login e cadastro';
    RAISE NOTICE '';
    RAISE NOTICE 'Rollback: Execute o script de rollback se necessario';
    RAISE NOTICE '  (veja secao ROLLBACK no final deste arquivo)';
    RAISE NOTICE '';
END $$;

-- ================================================================
-- SECAO DE ROLLBACK (NAO EXECUTAR - APENAS DOCUMENTACAO)
-- ================================================================

/*
-- ================================================================
-- ROLLBACK: Como reverter as alteracoes deste script
-- ================================================================
-- 
-- ATENCAO: Execute APENAS se precisar reverter as alteracoes!
-- 
-- ================================================================

-- 1. Remover campos two_fa_enabled
ALTER TABLE clientes DROP COLUMN IF EXISTS two_fa_enabled;
ALTER TABLE proprietarios DROP COLUMN IF EXISTS two_fa_enabled;

-- 2. Remover indices criados
DROP INDEX IF EXISTS idx_clientes_email;
DROP INDEX IF EXISTS idx_proprietarios_email;

-- 3. Remover comentarios (opcional)
COMMENT ON COLUMN clientes.two_fa_enabled IS NULL;
COMMENT ON COLUMN clientes.email IS NULL;
COMMENT ON COLUMN clientes.password IS NULL;
COMMENT ON COLUMN proprietarios.two_fa_enabled IS NULL;
COMMENT ON COLUMN proprietarios.email IS NULL;
COMMENT ON COLUMN proprietarios.password IS NULL;

-- 4. Remover tabelas de backup (opcional - manter para seguranca)
-- DROP TABLE IF EXISTS clientes_backup_estrutura_20251105;
-- DROP TABLE IF EXISTS proprietarios_backup_estrutura_20251105;

-- Verificacao pos-rollback
SELECT 
    'clientes' as tabela,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'clientes'
  AND column_name IN ('two_fa_enabled', 'email', 'password')
UNION ALL
SELECT 
    'proprietarios' as tabela,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'proprietarios'
  AND column_name IN ('two_fa_enabled', 'email', 'password');

-- Se o resultado nao mostrar two_fa_enabled, o rollback foi bem-sucedido

-- ================================================================
*/

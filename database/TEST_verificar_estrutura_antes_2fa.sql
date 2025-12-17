-- ================================================================
-- SCRIPT DE TESTE: Verificar Estrutura Antes de Aplicar 2FA
-- Sistema: Net Imobiliária
-- Data: 05/11/2025
-- ================================================================
-- 
-- Execute este script ANTES de aplicar as alterações de 2FA
-- para verificar se o ambiente está pronto
-- 
-- ================================================================

\echo '================================================'
\echo 'TESTE: Verificação de Pré-Requisitos para 2FA'
\echo '================================================'
\echo ''

-- ================================================================
-- 1. VERIFICAR SE TABELAS EXISTEM
-- ================================================================

\echo '1. Verificando se tabelas existem...'
\echo ''

SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'clientes') 
        THEN '✅ Tabela CLIENTES existe'
        ELSE '❌ ERRO: Tabela CLIENTES não existe'
    END as status
UNION ALL
SELECT 
    CASE 
        WHEN EXISTS (SELECT FROM pg_tables WHERE tablename = 'proprietarios') 
        THEN '✅ Tabela PROPRIETARIOS existe'
        ELSE '❌ ERRO: Tabela PROPRIETARIOS não existe'
    END;

\echo ''

-- ================================================================
-- 2. VERIFICAR CAMPOS NECESSÁRIOS
-- ================================================================

\echo '2. Verificando campos necessários...'
\echo ''

-- Campos em CLIENTES
SELECT 
    'CLIENTES' as tabela,
    column_name as campo,
    data_type as tipo,
    CASE 
        WHEN column_name IN ('email', 'password') THEN '✅ OK'
        ELSE '⚠️ Não obrigatório'
    END as status
FROM information_schema.columns
WHERE table_name = 'clientes'
  AND column_name IN ('id', 'nome', 'cpf', 'email', 'password')
ORDER BY 
    CASE column_name 
        WHEN 'id' THEN 1
        WHEN 'nome' THEN 2
        WHEN 'cpf' THEN 3
        WHEN 'email' THEN 4
        WHEN 'password' THEN 5
    END;

\echo ''

-- Campos em PROPRIETARIOS
SELECT 
    'PROPRIETARIOS' as tabela,
    column_name as campo,
    data_type as tipo,
    CASE 
        WHEN column_name IN ('email', 'password') THEN '✅ OK'
        ELSE '⚠️ Não obrigatório'
    END as status
FROM information_schema.columns
WHERE table_name = 'proprietarios'
  AND column_name IN ('id', 'nome', 'cpf', 'email', 'password')
ORDER BY 
    CASE column_name 
        WHEN 'id' THEN 1
        WHEN 'nome' THEN 2
        WHEN 'cpf' THEN 3
        WHEN 'email' THEN 4
        WHEN 'password' THEN 5
    END;

\echo ''

-- ================================================================
-- 3. VERIFICAR SE CAMPOS 2FA JÁ EXISTEM
-- ================================================================

\echo '3. Verificando se campos 2FA já existem...'
\echo ''

SELECT 
    CASE 
        WHEN NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'clientes' AND column_name = 'two_fa_enabled'
        ) 
        THEN '✅ Campo two_fa_enabled NÃO existe em clientes (pronto para adicionar)'
        ELSE '⚠️ Campo two_fa_enabled JÁ existe em clientes (será pulado)'
    END as status
UNION ALL
SELECT 
    CASE 
        WHEN NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_name = 'proprietarios' AND column_name = 'two_fa_enabled'
        ) 
        THEN '✅ Campo two_fa_enabled NÃO existe em proprietarios (pronto para adicionar)'
        ELSE '⚠️ Campo two_fa_enabled JÁ existe em proprietarios (será pulado)'
    END;

\echo ''

-- ================================================================
-- 4. VERIFICAR ÍNDICES EXISTENTES
-- ================================================================

\echo '4. Verificando índices existentes...'
\echo ''

SELECT 
    CASE 
        WHEN NOT EXISTS (
            SELECT FROM pg_indexes 
            WHERE tablename = 'clientes' AND indexname = 'idx_clientes_email'
        ) 
        THEN '✅ Índice idx_clientes_email NÃO existe (pronto para criar)'
        ELSE '⚠️ Índice idx_clientes_email JÁ existe (será pulado)'
    END as status
UNION ALL
SELECT 
    CASE 
        WHEN NOT EXISTS (
            SELECT FROM pg_indexes 
            WHERE tablename = 'proprietarios' AND indexname = 'idx_proprietarios_email'
        ) 
        THEN '✅ Índice idx_proprietarios_email NÃO existe (pronto para criar)'
        ELSE '⚠️ Índice idx_proprietarios_email JÁ existe (será pulado)'
    END;

\echo ''

-- ================================================================
-- 5. CONTAR REGISTROS EXISTENTES
-- ================================================================

\echo '5. Contando registros existentes...'
\echo ''

SELECT 
    'CLIENTES' as tabela,
    COUNT(*) as total_registros,
    '📊 Registros atuais' as info
FROM clientes
UNION ALL
SELECT 
    'PROPRIETARIOS' as tabela,
    COUNT(*) as total_registros,
    '📊 Registros atuais' as info
FROM proprietarios;

\echo ''

-- ================================================================
-- 6. VERIFICAR PERMISSÕES DO USUÁRIO
-- ================================================================

\echo '6. Verificando permissões do usuário atual...'
\echo ''

SELECT 
    current_user as usuario_atual,
    CASE 
        WHEN has_table_privilege(current_user, 'clientes', 'SELECT, INSERT, UPDATE, DELETE') 
        THEN '✅ Tem permissões em clientes'
        ELSE '❌ ERRO: Sem permissões em clientes'
    END as permissao_clientes,
    CASE 
        WHEN has_table_privilege(current_user, 'proprietarios', 'SELECT, INSERT, UPDATE, DELETE') 
        THEN '✅ Tem permissões em proprietarios'
        ELSE '❌ ERRO: Sem permissões em proprietarios'
    END as permissao_proprietarios;

\echo ''

-- ================================================================
-- 7. RELATÓRIO FINAL
-- ================================================================

\echo ''
\echo '================================================'
\echo 'RELATÓRIO FINAL DE PRÉ-REQUISITOS'
\echo '================================================'
\echo ''

DO $$
DECLARE
    clientes_exists BOOLEAN;
    proprietarios_exists BOOLEAN;
    clientes_email BOOLEAN;
    clientes_password BOOLEAN;
    proprietarios_email BOOLEAN;
    proprietarios_password BOOLEAN;
    two_fa_clientes BOOLEAN;
    two_fa_proprietarios BOOLEAN;
    all_ok BOOLEAN := true;
BEGIN
    -- Verificar tabelas
    SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'clientes') INTO clientes_exists;
    SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'proprietarios') INTO proprietarios_exists;
    
    -- Verificar campos
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'clientes' AND column_name = 'email'
    ) INTO clientes_email;
    
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'clientes' AND column_name = 'password'
    ) INTO clientes_password;
    
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'proprietarios' AND column_name = 'email'
    ) INTO proprietarios_email;
    
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'proprietarios' AND column_name = 'password'
    ) INTO proprietarios_password;
    
    -- Verificar se 2FA já existe
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'clientes' AND column_name = 'two_fa_enabled'
    ) INTO two_fa_clientes;
    
    SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'proprietarios' AND column_name = 'two_fa_enabled'
    ) INTO two_fa_proprietarios;
    
    -- Validações
    IF NOT clientes_exists THEN
        RAISE NOTICE '❌ BLOQUEADOR: Tabela clientes não existe';
        all_ok := false;
    END IF;
    
    IF NOT proprietarios_exists THEN
        RAISE NOTICE '❌ BLOQUEADOR: Tabela proprietarios não existe';
        all_ok := false;
    END IF;
    
    IF NOT clientes_email THEN
        RAISE NOTICE '❌ BLOQUEADOR: Campo email não existe na tabela clientes';
        all_ok := false;
    END IF;
    
    IF NOT clientes_password THEN
        RAISE NOTICE '❌ BLOQUEADOR: Campo password não existe na tabela clientes';
        all_ok := false;
    END IF;
    
    IF NOT proprietarios_email THEN
        RAISE NOTICE '❌ BLOQUEADOR: Campo email não existe na tabela proprietarios';
        all_ok := false;
    END IF;
    
    IF NOT proprietarios_password THEN
        RAISE NOTICE '❌ BLOQUEADOR: Campo password não existe na tabela proprietarios';
        all_ok := false;
    END IF;
    
    -- Avisos
    IF two_fa_clientes THEN
        RAISE NOTICE '⚠️  AVISO: Campo two_fa_enabled já existe em clientes (será pulado)';
    END IF;
    
    IF two_fa_proprietarios THEN
        RAISE NOTICE '⚠️  AVISO: Campo two_fa_enabled já existe em proprietarios (será pulado)';
    END IF;
    
    -- Resultado final
    RAISE NOTICE '';
    IF all_ok THEN
        RAISE NOTICE '================================================';
        RAISE NOTICE '✅ AMBIENTE PRONTO PARA APLICAR ALTERAÇÕES 2FA!';
        RAISE NOTICE '================================================';
        RAISE NOTICE '';
        RAISE NOTICE 'Próximo passo:';
        RAISE NOTICE '  Execute: database/add_2fa_fields_clientes_proprietarios.sql';
    ELSE
        RAISE NOTICE '================================================';
        RAISE NOTICE '❌ AMBIENTE NÃO ESTÁ PRONTO!';
        RAISE NOTICE '================================================';
        RAISE NOTICE '';
        RAISE NOTICE 'Corrija os BLOQUEADORES acima antes de prosseguir.';
    END IF;
    RAISE NOTICE '';
END $$;



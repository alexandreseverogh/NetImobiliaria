-- Script de Verificação: Verificar se as tabelas Parametros e Valor_Destaque_Local foram criadas
-- Execute este script para diagnosticar o problema

-- 1. Verificar se as tabelas existem (com e sem aspas)
SELECT 
    'VERIFICAÇÃO DE TABELAS' as tipo,
    table_name as nome_tabela,
    table_schema as schema,
    'EXISTE' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
    table_name = 'Parametros' 
    OR table_name = 'parametros'
    OR table_name = 'Valor_Destaque_Local'
    OR table_name = 'valor_destaque_local'
    OR LOWER(table_name) = 'parametros'
    OR LOWER(table_name) = 'valor_destaque_local'
)
ORDER BY table_name;

-- 2. Verificar todas as tabelas que começam com 'param' ou 'valor'
SELECT 
    'TABELAS SIMILARES' as tipo,
    table_name as nome_tabela,
    'POSSÍVEL MATCH' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (
    LOWER(table_name) LIKE '%param%'
    OR LOWER(table_name) LIKE '%destaque%'
    OR LOWER(table_name) LIKE '%valor%'
)
ORDER BY table_name;

-- 3. Tentar acessar as tabelas diretamente (vai mostrar erro se não existirem)
DO $$
BEGIN
    -- Tentar acessar Parametros (com aspas)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Parametros' AND table_schema = 'public') THEN
        RAISE NOTICE '✓ Tabela "Parametros" EXISTE (com aspas/case-sensitive)';
    ELSE
        RAISE NOTICE '✗ Tabela "Parametros" NÃO EXISTE (com aspas/case-sensitive)';
    END IF;
    
    -- Tentar acessar parametros (sem aspas)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parametros' AND table_schema = 'public') THEN
        RAISE NOTICE '✓ Tabela parametros EXISTE (sem aspas)';
    ELSE
        RAISE NOTICE '✗ Tabela parametros NÃO EXISTE (sem aspas)';
    END IF;
    
    -- Tentar acessar Valor_Destaque_Local (com aspas)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Valor_Destaque_Local' AND table_schema = 'public') THEN
        RAISE NOTICE '✓ Tabela "Valor_Destaque_Local" EXISTE (com aspas/case-sensitive)';
    ELSE
        RAISE NOTICE '✗ Tabela "Valor_Destaque_Local" NÃO EXISTE (com aspas/case-sensitive)';
    END IF;
    
    -- Tentar acessar valor_destaque_local (sem aspas)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'valor_destaque_local' AND table_schema = 'public') THEN
        RAISE NOTICE '✓ Tabela valor_destaque_local EXISTE (sem aspas)';
    ELSE
        RAISE NOTICE '✗ Tabela valor_destaque_local NÃO EXISTE (sem aspas)';
    END IF;
END $$;

-- 4. Verificar estrutura se as tabelas existirem
-- Estrutura de Parametros (se existir)
SELECT 
    'ESTRUTURA Parametros' as tipo,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (
    table_name = 'Parametros' 
    OR table_name = 'parametros'
)
ORDER BY ordinal_position;

-- Estrutura de Valor_Destaque_Local (se existir)
SELECT 
    'ESTRUTURA Valor_Destaque_Local' as tipo,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND (
    table_name = 'Valor_Destaque_Local'
    OR table_name = 'valor_destaque_local'
)
ORDER BY ordinal_position;

-- 5. Verificar erros recentes (se houver log de erros)
SELECT 
    'VERIFICAÇÃO COMPLETA' as status,
    NOW() as executado_em;


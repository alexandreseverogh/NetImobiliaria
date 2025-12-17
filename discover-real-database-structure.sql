-- ========================================
-- DESCOBRIR ESTRUTURA REAL DO BANCO
-- ========================================
-- 
-- Este script descobre EXATAMENTE quais tabelas existem
-- para implementar a sidebar hierárquica + permissões

-- 1. VER TODAS AS TABELAS EXISTENTES
SELECT 
    'TABELAS EXISTENTES' as tipo,
    table_name as tabela,
    'EXISTE' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 2. VER TABELAS RELACIONADAS A USUÁRIOS
SELECT 
    'TABELAS DE USUÁRIOS' as tipo,
    table_name as tabela,
    'EXISTE' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%user%'
ORDER BY table_name;

-- 3. VER TABELAS RELACIONADAS A PERMISSÕES
SELECT 
    'TABELAS DE PERMISSÕES' as tipo,
    table_name as tabela,
    'EXISTE' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND (table_name LIKE '%permission%' OR table_name LIKE '%role%')
ORDER BY table_name;

-- 4. VER TABELAS RELACIONADAS A CATEGORIAS
SELECT 
    'TABELAS DE CATEGORIAS' as tipo,
    table_name as tabela,
    'EXISTE' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%categor%'
ORDER BY table_name;

-- 5. VER TABELAS RELACIONADAS A FUNCIONALIDADES
SELECT 
    'TABELAS DE FUNCIONALIDADES' as tipo,
    table_name as tabela,
    'EXISTE' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%feature%'
ORDER BY table_name;

-- 6. VER ESTRUTURA DA TABELA users (se existir)
SELECT 
    'ESTRUTURA users' as tipo,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'users'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. VER ESTRUTURA DA TABELA system_features (se existir)
SELECT 
    'ESTRUTURA system_features' as tipo,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'system_features'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 8. VER ESTRUTURA DA TABELA system_categorias (se existir)
SELECT 
    'ESTRUTURA system_categorias' as tipo,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'system_categorias'
AND table_schema = 'public'
ORDER BY ordinal_position;

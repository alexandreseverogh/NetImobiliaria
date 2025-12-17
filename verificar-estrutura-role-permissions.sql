-- ============================================
-- VERIFICAR ESTRUTURA DA TABELA role_permissions
-- ============================================

-- 1. Verificar se tabela existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'role_permissions'
        ) THEN 'Tabela role_permissions EXISTE'
        ELSE 'Tabela role_permissions NÃO EXISTE'
    END as status_tabela;

-- 2. Se existir, mostrar estrutura
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'role_permissions' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Se existir, mostrar dados de exemplo
SELECT * FROM role_permissions LIMIT 5;

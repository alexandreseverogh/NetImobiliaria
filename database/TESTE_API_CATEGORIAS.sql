-- ============================================================
-- TESTE DA API DE CATEGORIAS
-- ============================================================
-- Objetivo: Verificar se a API está retornando dados corretamente
-- ============================================================

-- 1. Verificar estrutura da tabela system_categorias
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'system_categorias' 
ORDER BY ordinal_position;

-- 2. Verificar dados das categorias
SELECT 
    id,
    name,
    slug,
    description,
    icon,
    color,
    sort_order,
    is_active,
    created_at
FROM system_categorias 
ORDER BY sort_order, name;

-- 3. Verificar se há permissões para acessar categorias
SELECT 
    p.id,
    p.action,
    p.description,
    sf.name as feature_name
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE sf.name ILIKE '%categoria%'
ORDER BY sf.name, p.action;

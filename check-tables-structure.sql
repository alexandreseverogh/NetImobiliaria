-- Verificar estrutura da tabela system_categorias
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'system_categorias' 
ORDER BY ordinal_position;

-- Verificar dados da tabela system_categorias
SELECT * FROM system_categorias ORDER BY sort_order;

-- Verificar estrutura da tabela system_features
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'system_features' 
ORDER BY ordinal_position;

-- Verificar dados da tabela system_features (primeiras 10 linhas)
SELECT id, name, category_id, url, is_active 
FROM system_features 
ORDER BY id 
LIMIT 10;

-- Verificar relacionamento entre system_features e system_categorias
SELECT 
    sf.id,
    sf.name as feature_name,
    sf.category_id,
    sc.name as category_name,
    sc.slug as category_slug,
    sc.color as category_color
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
ORDER BY sc.sort_order, sf.name;

-- Verificar se existem constraints de FK
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND (tc.table_name = 'system_features' OR tc.table_name = 'system_categorias');

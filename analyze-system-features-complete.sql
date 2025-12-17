-- Análise completa da tabela system_features
-- 1. Total de funcionalidades
SELECT 'TOTAL FUNCIONALIDADES' as info, COUNT(*) as total 
FROM system_features;

-- 2. Funcionalidades ativas vs inativas
SELECT 'FUNCIONALIDADES ATIVAS/INATIVAS' as info, 
       is_active, 
       COUNT(*) as total
FROM system_features 
GROUP BY is_active;

-- 3. Todas as funcionalidades com detalhes
SELECT 'TODAS AS FUNCIONALIDADES' as info,
       id,
       name,
       description,
       url,
       is_active,
       category_id,
       created_at
FROM system_features 
ORDER BY is_active DESC, name;

-- 4. Funcionalidades por categoria
SELECT 'FUNCIONALIDADES POR CATEGORIA' as info,
       sc.name as categoria,
       sc.slug as categoria_slug,
       COUNT(sf.id) as total_funcionalidades
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
GROUP BY sc.id, sc.name, sc.slug
ORDER BY sc.sort_order;

-- 5. Funcionalidades SEM categoria
SELECT 'FUNCIONALIDADES SEM CATEGORIA' as info,
       id, name, url, category_id
FROM system_features 
WHERE category_id IS NULL OR category_id = 0;

-- 6. Verificar se existem funcionalidades esperadas
SELECT 'FUNCIONALIDADES ESPERADAS' as info,
       CASE 
         WHEN EXISTS (SELECT 1 FROM system_features WHERE name LIKE '%Funcionalidades%') THEN 'SIM'
         ELSE 'NÃO'
       END as tem_funcionalidades,
       CASE 
         WHEN EXISTS (SELECT 1 FROM system_features WHERE name LIKE '%Categorias%') THEN 'SIM'
         ELSE 'NÃO'
       END as tem_categorias,
       CASE 
         WHEN EXISTS (SELECT 1 FROM system_features WHERE name LIKE '%Configurações%') THEN 'SIM'
         ELSE 'NÃO'
       END as tem_configuracoes;

-- 7. Buscar funcionalidades que podem estar relacionadas ao sidebar
SELECT 'FUNCIONALIDADES SIDEBAR' as info,
       name,
       url,
       is_active,
       category_id
FROM system_features 
WHERE name ILIKE '%funcionalidades%' 
   OR name ILIKE '%categorias%'
   OR name ILIKE '%configurações%'
   OR name ILIKE '%perfis%'
   OR name ILIKE '%usuários%'
   OR name ILIKE '%permissões%'
   OR name ILIKE '%hierarquia%'
   OR name ILIKE '%gestão%'
   OR name ILIKE '%tipos%'
   OR name ILIKE '%documentos%'
ORDER BY name;


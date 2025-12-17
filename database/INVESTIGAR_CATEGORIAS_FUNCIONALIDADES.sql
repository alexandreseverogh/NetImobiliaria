-- Investigar funcionalidade "Categorias de Funcionalidades"
SELECT 
    sf.id, 
    sf.name, 
    sf."Crud_Execute", 
    p.action, 
    p.description 
FROM system_features sf 
LEFT JOIN permissions p ON sf.id = p.feature_id 
WHERE sf.name = 'Categorias de Funcionalidades' 
ORDER BY sf.id, p.action;

-- Verificar se há duplicatas
SELECT 
    sf.id,
    sf.name,
    COUNT(p.id) as total_permissoes,
    STRING_AGG(DISTINCT p.action, ', ' ORDER BY p.action) as acoes
FROM system_features sf 
LEFT JOIN permissions p ON sf.id = p.feature_id 
WHERE sf.name = 'Categorias de Funcionalidades'
GROUP BY sf.id, sf.name;

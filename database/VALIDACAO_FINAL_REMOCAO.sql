-- Verificação final após remoção da duplicata
SELECT 
    sf.id,
    sf.name,
    sf."Crud_Execute",
    COUNT(p.id) as total_permissoes,
    STRING_AGG(DISTINCT p.action, ', ' ORDER BY p.action) as acoes
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
WHERE sf.name = 'Categorias de Funcionalidades'
GROUP BY sf.id, sf.name, sf."Crud_Execute";

-- Contagem total de funcionalidades
SELECT 
    'Total de funcionalidades' as metrica,
    COUNT(*) as valor
FROM system_features
UNION ALL
SELECT 
    'Funcionalidades CRUD' as metrica,
    COUNT(*) as valor
FROM system_features WHERE "Crud_Execute" = 'CRUD'
UNION ALL
SELECT 
    'Funcionalidades EXECUTE' as metrica,
    COUNT(*) as valor
FROM system_features WHERE "Crud_Execute" = 'EXECUTE';

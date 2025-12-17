-- Análise da estrutura de permissões
SELECT p.id, sf.name as feature_name, sf."Crud_Execute" as type, p.action, p.description 
FROM permissions p 
LEFT JOIN system_features sf ON p.feature_id = sf.id 
ORDER BY sf.name, p.action 
LIMIT 50;

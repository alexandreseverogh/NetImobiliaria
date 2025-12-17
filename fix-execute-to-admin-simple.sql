-- Script simples para converter 'execute' para 'ADMIN'
-- Execute este script no pgAdmin4

-- 1. Verificar registros que serão alterados
SELECT 
    p.id,
    p.action,
    p.description,
    sf.name as feature_name
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE p.action = 'execute';

-- 2. Atualizar permissões de 'execute' para 'ADMIN'
UPDATE permissions 
SET 
    action = 'ADMIN',
    description = REPLACE(description, 'Executar', 'Acesso administrativo a'),
    updated_at = NOW()
WHERE action = 'execute';

-- 3. Verificar se a atualização foi bem-sucedida
SELECT 
    p.id,
    p.action,
    p.description,
    sf.name as feature_name
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE p.action = 'ADMIN'
ORDER BY sf.name;





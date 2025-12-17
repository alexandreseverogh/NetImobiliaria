-- =====================================================
-- SCRIPT DE PADRONIZAÇÃO DE PERMISSÕES
-- Alterar 'execute' para 'ADMIN' em funcionalidades únicas
-- =====================================================

-- Verificar registros que serão alterados ANTES da execução
SELECT 
    p.id,
    p.action,
    p.description,
    sf.name as feature_name,
    sf.description as feature_description
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE p.action = 'execute'
ORDER BY sf.name;

-- =====================================================
-- ATUALIZAÇÃO DOS REGISTROS
-- =====================================================

-- 1. Atualizar permissões de 'execute' para 'ADMIN'
UPDATE permissions 
SET 
    action = 'ADMIN',
    description = REPLACE(description, 'Executar', 'Acesso administrativo a'),
    updated_at = NOW()
WHERE action = 'execute';

-- 2. Verificar se a atualização foi bem-sucedida
SELECT 
    p.id,
    p.action,
    p.description,
    sf.name as feature_name
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE p.action = 'ADMIN'
ORDER BY sf.name;

-- 3. Verificar se ainda existem registros com 'execute'
SELECT COUNT(*) as registros_execute_restantes
FROM permissions 
WHERE action = 'execute';

-- =====================================================
-- RELATÓRIO FINAL
-- =====================================================

-- Mostrar todas as permissões ADMIN criadas
SELECT 
    sf.name as funcionalidade,
    p.action,
    p.description,
    COUNT(rp.role_id) as perfis_com_acesso
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
LEFT JOIN role_permissions rp ON p.id = rp.permission_id
WHERE p.action = 'ADMIN'
GROUP BY sf.name, p.action, p.description
ORDER BY sf.name;

-- =====================================================
-- INSTRUÇÕES DE EXECUÇÃO
-- =====================================================
/*
1. Execute a primeira query para ver quais registros serão alterados
2. Se estiver correto, execute o UPDATE
3. Execute as queries de verificação para confirmar
4. Execute o relatório final para ver o resultado

IMPORTANTE: Faça backup antes de executar!
*/





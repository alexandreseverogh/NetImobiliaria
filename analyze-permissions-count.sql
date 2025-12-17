-- Análise detalhada das 180 permissões
-- 1. Quantas funcionalidades temos?
SELECT 'TOTAL FUNCIONALIDADES' as info, COUNT(*) as total 
FROM system_features WHERE is_active = true;

-- 2. Quantas permissões por funcionalidade?
SELECT 'PERMISSÕES POR FUNCIONALIDADE' as info, 
       sf.name as feature_name,
       COUNT(p.id) as total_permissions,
       STRING_AGG(p.action, ', ') as actions
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
WHERE sf.is_active = true
GROUP BY sf.id, sf.name
ORDER BY COUNT(p.id) DESC, sf.name;

-- 3. Total de permissões por ação
SELECT 'TOTAL POR AÇÃO' as info, 
       p.action,
       COUNT(*) as total
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE sf.is_active = true
GROUP BY p.action
ORDER BY p.action;

-- 4. Verificar se há permissões duplicadas
SELECT 'VERIFICAÇÃO DUPLICATAS' as info,
       sf.name as feature_name,
       p.action,
       COUNT(*) as duplicatas
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE sf.is_active = true
GROUP BY sf.id, sf.name, p.action
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- 5. Cálculo esperado: 36 funcionalidades × 5 ações = 180 permissões?
SELECT 'CÁLCULO ESPERADO' as info,
       (SELECT COUNT(*) FROM system_features WHERE is_active = true) as funcionalidades,
       5 as acoes_por_funcionalidade,
       (SELECT COUNT(*) FROM system_features WHERE is_active = true) * 5 as total_esperado;


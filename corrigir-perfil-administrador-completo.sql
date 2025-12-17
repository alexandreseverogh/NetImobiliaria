-- ============================================
-- CORRIGIR PERFIL ADMINISTRADOR - TODAS AS PERMISSÕES
-- ============================================

-- 1. Verificar perfil Administrador atual
SELECT 
    'PERFIL ADMINISTRADOR ATUAL' as verificacao;

SELECT 
    id,
    name,
    description,
    is_active
FROM user_roles 
WHERE name ILIKE '%administrador%'
ORDER BY name;

-- 2. Verificar quantas permissões o Administrador tem atualmente
SELECT 
    'PERMISSÕES ATUAIS DO ADMINISTRADOR' as verificacao;

SELECT 
    COUNT(*) as total_permissoes,
    COUNT(CASE WHEN rp.role_id IS NOT NULL THEN 1 END) as permissoes_concedidas
FROM permissions p
LEFT JOIN role_permissions rp ON p.id = rp.permission_id 
    AND rp.role_id = (SELECT id FROM user_roles WHERE name ILIKE '%administrador%');

-- 3. Adicionar TODAS as permissões para o perfil Administrador
INSERT INTO role_permissions (role_id, permission_id, granted_by, granted_at)
SELECT 
    ur.id as role_id,
    p.id as permission_id,
    (SELECT u.id FROM users u WHERE u.username = 'admin' LIMIT 1) as granted_by,
    NOW() as granted_at
FROM user_roles ur
CROSS JOIN permissions p
WHERE ur.name ILIKE '%administrador%'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = ur.id 
      AND rp.permission_id = p.id
  );

-- 4. Verificar se todas as permissões foram adicionadas
SELECT 
    'VERIFICAÇÃO FINAL - ADMINISTRADOR' as verificacao;

SELECT 
    COUNT(*) as total_permissoes,
    COUNT(CASE WHEN rp.role_id IS NOT NULL THEN 1 END) as permissoes_concedidas
FROM permissions p
LEFT JOIN role_permissions rp ON p.id = rp.permission_id 
    AND rp.role_id = (SELECT id FROM user_roles WHERE name ILIKE '%administrador%');

-- 5. Verificar permissões por categoria
SELECT 
    'PERMISSÕES POR CATEGORIA - ADMINISTRADOR' as verificacao;

SELECT 
    sf.category,
    COUNT(*) as total,
    COUNT(rp.permission_id) as concedidas
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
LEFT JOIN role_permissions rp ON p.id = rp.permission_id 
    AND rp.role_id = (SELECT id FROM user_roles WHERE name ILIKE '%administrador%')
GROUP BY sf.category
ORDER BY sf.category;

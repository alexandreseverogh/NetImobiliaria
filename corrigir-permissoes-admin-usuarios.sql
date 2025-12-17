-- ============================================
-- CORRIGIR PERMISSÕES DO ADMIN PARA USUÁRIOS
-- ============================================

-- 1. Verificar permissões atuais do admin para usuários
SELECT 
    'PERMISSÕES ATUAIS DO ADMIN PARA USUÁRIOS' as verificacao;

SELECT 
    sf.category,
    p.action,
    p.description,
    rp.granted_at
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN role_permissions rp ON ura.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'admin'
  AND sf.category = 'usuarios'
ORDER BY p.action;

-- 2. Buscar ID do perfil do admin
SELECT 
    'ID DO PERFIL DO ADMIN' as verificacao;

SELECT 
    ur.id as role_id,
    ur.name as role_name
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin';

-- 3. Buscar permissões disponíveis para usuários
SELECT 
    'PERMISSÕES DISPONÍVEIS PARA USUÁRIOS' as verificacao;

SELECT 
    p.id as permission_id,
    p.action,
    p.description
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE sf.category = 'usuarios'
ORDER BY p.action;

-- 4. Adicionar permissões faltantes para o admin (CREATE e UPDATE)
INSERT INTO role_permissions (role_id, permission_id, granted_by, granted_at)
SELECT 
    ura.role_id,
    p.id,
    u.id as granted_by,
    NOW() as granted_at
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN permissions p ON p.feature_id = (
    SELECT sf.id FROM system_features sf WHERE sf.category = 'usuarios'
)
WHERE u.username = 'admin'
  AND p.action IN ('create', 'update')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = ura.role_id 
      AND rp.permission_id = p.id
  );

-- 5. Verificar permissões após correção
SELECT 
    'PERMISSÕES APÓS CORREÇÃO' as verificacao;

SELECT 
    sf.category,
    p.action,
    p.description,
    rp.granted_at
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN role_permissions rp ON ura.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE u.username = 'admin'
  AND sf.category = 'usuarios'
ORDER BY p.action;

-- 6. Verificar se agora tem permissão WRITE
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM users u
            JOIN user_role_assignments ura ON u.id = ura.user_id
            JOIN role_permissions rp ON ura.role_id = rp.role_id
            JOIN permissions p ON rp.permission_id = p.id
            JOIN system_features sf ON p.feature_id = sf.id
            WHERE u.username = 'admin'
              AND sf.category = 'usuarios'
              AND (p.action = 'create' OR p.action = 'update')
        ) THEN '✅ Admin AGORA TEM permissão WRITE para usuários'
        ELSE '❌ Admin AINDA NÃO TEM permissão WRITE para usuários'
    END as status_final;

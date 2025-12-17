-- ============================================================
-- TESTE: ESTRUTURA DA TABELA USER_ROLES
-- Verificação de campos, relacionamentos e constraints
-- ============================================================

-- 1. VERIFICAR ESTRUTURA DA TABELA user_roles
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'user_roles'
ORDER BY ordinal_position;

-- 2. VERIFICAR FOREIGN KEYS
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
    AND tc.table_name = 'user_roles';

-- 3. VERIFICAR ÍNDICES
SELECT
    i.relname AS index_name,
    a.attname AS column_name,
    ix.indisunique AS is_unique
FROM pg_class t
JOIN pg_index ix ON t.oid = ix.indrelid
JOIN pg_class i ON i.oid = ix.indexrelid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
WHERE t.relname = 'user_roles'
ORDER BY i.relname, a.attname;

-- 4. VERIFICAR RELACIONAMENTOS: user_role_assignments
SELECT
    'user_role_assignments' AS tabela,
    COUNT(*) AS total_registros,
    COUNT(DISTINCT user_id) AS usuarios_distintos,
    COUNT(DISTINCT role_id) AS perfis_distintos
FROM user_role_assignments;

-- 5. VERIFICAR RELACIONAMENTOS: role_permissions
SELECT
    'role_permissions' AS tabela,
    COUNT(*) AS total_registros,
    COUNT(DISTINCT role_id) AS perfis_com_permissões,
    COUNT(DISTINCT permission_id) AS permissões_atribuidas
FROM role_permissions;

-- 6. VERIFICAR ROLES EXISTENTES
SELECT
    id,
    name,
    description,
    level,
    is_system_role,
    requires_2fa,
    is_active,
    created_at,
    updated_at
FROM user_roles
ORDER BY level, name;

-- 7. VERIFICAR SE EXISTEM ROLES SEM RELACIONAMENTOS
SELECT 
    ur.id,
    ur.name,
    ur.level,
    COUNT(DISTINCT ura.user_id) AS total_usuarios,
    COUNT(DISTINCT rp.permission_id) AS total_permissoes
FROM user_roles ur
LEFT JOIN user_role_assignments ura ON ur.id = ura.role_id
LEFT JOIN role_permissions rp ON ur.id = rp.role_id
GROUP BY ur.id, ur.name, ur.level
ORDER BY ur.level, ur.name;

-- 8. TESTE DE INTEGRIDADE: Verificar roles órfãos
SELECT 
    ur.id,
    ur.name,
    'SEM USUÁRIOS' AS problema
FROM user_roles ur
LEFT JOIN user_role_assignments ura ON ur.id = ura.role_id
WHERE ura.id IS NULL

UNION ALL

SELECT 
    ur.id,
    ur.name,
    'SEM PERMISSÕES' AS problema
FROM user_roles ur
LEFT JOIN role_permissions rp ON ur.id = rp.role_id
WHERE rp.id IS NULL;

-- 9. VERIFICAR CASCADE DELETE: Role com usuários
SELECT 
    ur.id,
    ur.name,
    COUNT(DISTINCT ura.user_id) AS usuarios_associados,
    COUNT(DISTINCT rp.permission_id) AS permissoes_associadas
FROM user_roles ur
LEFT JOIN user_role_assignments ura ON ur.id = ura.role_id
LEFT JOIN role_permissions rp ON ur.id = rp.role_id
GROUP BY ur.id, ur.name
HAVING COUNT(DISTINCT ura.user_id) > 0
ORDER BY usuarios_associados DESC;

-- 10. RESUMO GERAL
SELECT 
    'user_roles' AS tabela,
    COUNT(*) AS total_registros,
    COUNT(CASE WHEN is_active = true THEN 1 END) AS ativos,
    COUNT(CASE WHEN requires_2fa = true THEN 1 END) AS com_2fa,
    COUNT(CASE WHEN is_system_role = true THEN 1 END) AS do_sistema,
    MIN(level) AS nivel_minimo,
    MAX(level) AS nivel_maximo
FROM user_roles;

-- Script de Teste: Simular exatamente a query da API /api/admin/user-features
-- Execute este script para ver o que a API retornaria para o usuário admin

-- 1. Buscar ID do usuário admin
SELECT 
    'ID DO USUÁRIO ADMIN' as tipo,
    id,
    username,
    email
FROM users
WHERE username = 'admin';

-- 2. Simular a query EXATA da API
-- Substitua $1 pelo ID do usuário admin encontrado acima
-- Exemplo: se o ID for 1, execute: SELECT ... WHERE ura.user_id = 1

-- PRIMEIRO, obtenha o ID do admin executando a query acima
-- Depois, execute a query abaixo substituindo :USER_ID pelo ID encontrado

-- Query simulada da API (substitua :USER_ID pelo ID do admin)
SELECT DISTINCT
    sf.id,
    sf.name,
    sf.description,
    sf.category_id,
    sf.url,
    sf.is_active,
    sc.name as category_name,
    sc.slug as category_slug,
    sc.icon as category_icon,
    sc.color as category_color,
    sc.sort_order as category_sort_order,
    '✅ DEVE APARECER' as status
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
JOIN permissions p ON sf.id = p.feature_id
JOIN role_permissions rp ON p.id = rp.permission_id
JOIN user_role_assignments ura ON rp.role_id = ura.role_id
WHERE ura.user_id = (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
  AND sf.is_active = true
  AND rp.is_active = true
  AND ura.is_active = true
  AND sf.id = 57  -- Filtrar apenas Receitas de Destaques
ORDER BY 
    COALESCE(sc.sort_order, 999),
    sc.name,
    sf.name;

-- 3. Verificar cada etapa da query separadamente
SELECT 
    'ETAPA 1: Funcionalidade existe e está ativa?' as etapa,
    sf.id,
    sf.name,
    sf.is_active,
    CASE WHEN sf.is_active = true THEN '✅ SIM' ELSE '❌ NÃO' END as resultado
FROM system_features sf
WHERE sf.id = 57;

SELECT 
    'ETAPA 2: Tem category_id?' as etapa,
    sf.id,
    sf.name,
    sf.category_id,
    sc.name as categoria,
    CASE WHEN sf.category_id IS NOT NULL THEN '✅ SIM' ELSE '❌ NÃO' END as resultado
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
WHERE sf.id = 57;

SELECT 
    'ETAPA 3: Tem permissão execute?' as etapa,
    p.id,
    p.feature_id,
    p.action,
    CASE WHEN p.action = 'execute' THEN '✅ SIM' ELSE '❌ NÃO' END as resultado
FROM permissions p
WHERE p.feature_id = 57;

SELECT 
    'ETAPA 4: Role permissions está ativo?' as etapa,
    rp.id,
    rp.role_id,
    rp.permission_id,
    rp.is_active,
    ur.name as role,
    CASE WHEN rp.is_active = true THEN '✅ SIM' ELSE '❌ NÃO' END as resultado
FROM role_permissions rp
JOIN user_roles ur ON rp.role_id = ur.id
JOIN permissions p ON rp.permission_id = p.id
WHERE p.feature_id = 57;

SELECT 
    'ETAPA 5: User role assignment está ativo para admin?' as etapa,
    u.id as user_id,
    u.username,
    ura.role_id,
    ura.is_active,
    ur.name as role,
    CASE WHEN ura.is_active = true THEN '✅ SIM' ELSE '❌ NÃO' END as resultado
FROM users u
JOIN user_role_assignments ura ON u.id = ura.user_id
JOIN user_roles ur ON ura.role_id = ur.id
WHERE u.username = 'admin'
AND ur.name IN ('Super Admin', 'Administrador');

-- 4. Verificar se há algum problema de tipo de dados
SELECT 
    'VERIFICAÇÃO DE TIPOS' as tipo,
    'users.id' as coluna,
    data_type as tipo_dados
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'id'
UNION ALL
SELECT 
    'VERIFICAÇÃO DE TIPOS' as tipo,
    'user_role_assignments.user_id' as coluna,
    data_type as tipo_dados
FROM information_schema.columns
WHERE table_name = 'user_role_assignments' AND column_name = 'user_id';









-- Script de Verificação: Verificar se a funcionalidade ValorDestaques foi criada corretamente
-- Execute este script para diagnosticar problemas

-- 1. Verificar se a funcionalidade existe
SELECT 
    'VERIFICAÇÃO FUNCIONALIDADE' as tipo,
    sf.id,
    sf.name,
    sf.slug,
    sf.url,
    sf."Crud_Execute",
    sf.is_active
FROM system_features sf
WHERE sf.name = 'ValorDestaques' OR sf.slug = 'valordestaques' OR sf.slug = 'valores-anuncios-destaques';

-- 2. Verificar se a permissão EXECUTE foi criada
SELECT 
    'VERIFICAÇÃO PERMISSÃO' as tipo,
    p.id,
    p.action,
    p.description,
    sf.name as funcionalidade,
    sf.slug
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE sf.name = 'ValorDestaques' OR sf.slug = 'valordestaques' OR sf.slug = 'valores-anuncios-destaques';

-- 3. Verificar se a permissão foi atribuída aos roles
SELECT 
    'VERIFICAÇÃO ROLE_PERMISSIONS' as tipo,
    ur.name as role,
    p.action,
    sf.name as funcionalidade
FROM role_permissions rp
JOIN user_roles ur ON rp.role_id = ur.id
JOIN permissions p ON rp.permission_id = p.id
JOIN system_features sf ON p.feature_id = sf.id
WHERE sf.name = 'ValorDestaques' OR sf.slug = 'valordestaques' OR sf.slug = 'valores-anuncios-destaques';

-- 4. Verificar rotas configuradas
SELECT 
    'VERIFICAÇÃO ROTAS' as tipo,
    rpc.route_pattern,
    rpc.method,
    rpc.default_action,
    sf.name as funcionalidade
FROM route_permissions_config rpc
JOIN system_features sf ON rpc.feature_id = sf.id
WHERE sf.name = 'ValorDestaques' OR sf.slug = 'valordestaques' OR sf.slug = 'valores-anuncios-destaques';

-- 5. Verificar se a tabela valor_destaque_local tem dados
SELECT 
    'VERIFICAÇÃO TABELA' as tipo,
    COUNT(*) as total_registros,
    COUNT(DISTINCT estado_fk) as total_estados
FROM valor_destaque_local
WHERE cidade_fk = 'TODAS';

-- 6. Listar alguns registros da tabela
SELECT 
    'DADOS TABELA' as tipo,
    estado_fk,
    cidade_fk,
    valor_destaque
FROM valor_destaque_local
WHERE cidade_fk = 'TODAS'
ORDER BY estado_fk
LIMIT 10;


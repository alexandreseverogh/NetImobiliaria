-- ============================================================
-- REMOÇÃO SEGURA DA FUNCIONALIDADE DUPLICATA (ID 30)
-- ============================================================
-- Objetivo: Remover ID 30 mantendo ID 1 (original)
-- ============================================================

-- 1. BACKUP ANTES DA REMOÇÃO
CREATE TABLE IF NOT EXISTS backup_remocao_categorias_$(Get-Date -Format 'yyyyMMdd_HHmmss') AS 
SELECT * FROM system_features WHERE id = 30;

-- 2. REMOVER DEPENDÊNCIAS EM ORDEM SEGURA

-- 2.1. Remover role_permissions primeiro
DELETE FROM role_permissions 
WHERE permission_id IN (
    SELECT id FROM permissions WHERE feature_id = 30
);

-- 2.2. Remover permissions
DELETE FROM permissions WHERE feature_id = 30;

-- 2.3. Remover funcionalidade
DELETE FROM system_features WHERE id = 30;

-- 3. VERIFICAR RESULTADO
SELECT 
    'Funcionalidades restantes' as status,
    COUNT(*) as quantidade
FROM system_features 
WHERE name = 'Categorias de Funcionalidades';

-- 4. VERIFICAR SE PERMISSÕES ESTÃO CORRETAS
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

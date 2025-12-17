-- ============================================
-- Migration: Adicionar requires_2fa à tabela permissions
-- ============================================
-- Data: 30/10/2024
-- Objetivo: Eliminar hardcoding de 2FA, trazer do banco

BEGIN;

-- 1. Adicionar coluna requires_2fa à tabela permissions
ALTER TABLE permissions 
ADD COLUMN IF NOT EXISTS requires_2fa BOOLEAN DEFAULT false;

-- 2. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_permissions_requires_2fa 
ON permissions(requires_2fa) 
WHERE requires_2fa = true;

-- 3. Configurar 2FA para ações críticas no Sistema
UPDATE permissions 
SET requires_2fa = true
WHERE feature_id IN (
    SELECT id FROM system_features 
    WHERE slug IN (
        'auditoria-de-logs-do-sistema',
        'analise-de-logs',
        'expurgo-de-logs',
        'monitoramento-seguranca'
    )
)
AND action IN ('execute', 'delete');

-- 4. Configurar 2FA para exclusão e gerenciamento de usuários
UPDATE permissions 
SET requires_2fa = true
WHERE feature_id IN (
    SELECT id FROM system_features WHERE slug = 'usuarios'
)
AND action = 'delete';

-- 5. Configurar 2FA para gerenciamento de perfis críticos
UPDATE permissions 
SET requires_2fa = true
WHERE feature_id IN (
    SELECT id FROM system_features WHERE slug IN ('roles', 'permissions')
)
AND action IN ('delete', 'update');

-- 6. Configurar 2FA para funcionalidades do sistema
UPDATE permissions 
SET requires_2fa = true
WHERE feature_id IN (
    SELECT id FROM system_features WHERE slug = 'system-features'
)
AND action = 'delete';

-- Verificar alterações
SELECT 
    '=== PERMISSÕES COM 2FA ATIVADO ===' as info;

SELECT 
    sf.name as funcionalidade,
    sf.slug,
    p.action,
    p.requires_2fa
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE p.requires_2fa = true
ORDER BY sf.name, p.action;

SELECT 
    '=== TOTAL DE PERMISSÕES COM 2FA ===' as info;

SELECT 
    COUNT(*) as total_com_2fa
FROM permissions
WHERE requires_2fa = true;

COMMIT;

-- ROLLBACK: Se precisar reverter
-- BEGIN;
-- UPDATE permissions SET requires_2fa = false WHERE requires_2fa = true;
-- ALTER TABLE permissions DROP COLUMN requires_2fa;
-- COMMIT;




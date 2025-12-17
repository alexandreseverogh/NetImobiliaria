-- ============================================================
-- MIGRATION 017: Resetar 2FA para configuração manual
-- ============================================================
-- Objetivo: Remover configurações padrão de 2FA
-- Motivo: Administrador deve ter controle total via interface
-- Interface: /admin/config-2fa-permissions
-- ============================================================

BEGIN;

-- Verificar estado atual
SELECT 
    'ANTES DA MIGRACAO - Permissoes com 2FA ativo:' as info,
    COUNT(*) as total
FROM permissions
WHERE requires_2fa = true;

SELECT 
    sf.name as funcionalidade,
    p.action,
    p.requires_2fa
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE p.requires_2fa = true
ORDER BY sf.name, p.action;

-- Resetar TODAS as permissões para requires_2fa = false
UPDATE permissions 
SET requires_2fa = false
WHERE requires_2fa = true;

-- Verificar resultado
SELECT 
    'DEPOIS DA MIGRACAO - Permissoes com 2FA ativo:' as info,
    COUNT(*) as total
FROM permissions
WHERE requires_2fa = true;

-- Confirmar que TODAS estão desativadas
SELECT 
    COUNT(*) as total_permissoes,
    SUM(CASE WHEN requires_2fa = true THEN 1 ELSE 0 END) as com_2fa,
    SUM(CASE WHEN requires_2fa = false THEN 1 ELSE 0 END) as sem_2fa
FROM permissions;

COMMIT;

-- Mensagem final
SELECT 
    '===================================================' as info
UNION ALL
SELECT 
    'MIGRACAO 017 CONCLUIDA COM SUCESSO!' as info
UNION ALL
SELECT 
    'TODAS as permissoes agora tem requires_2fa = false' as info
UNION ALL
SELECT 
    'Configure 2FA manualmente em /admin/config-2fa-permissions' as info
UNION ALL
SELECT 
    '===================================================' as info;




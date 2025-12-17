-- ================================================================
-- MIGRATION 021: INVALIDAR TOKENS APÓS CORREÇÃO DE SLUGS
-- ================================================================
-- Os tokens JWT contêm slugs antigos (ex: "tipos-de-imoveis")
-- Precisamos forçar todos os usuários a fazerem login novamente
-- para receberem tokens com os slugs corretos
-- ================================================================

BEGIN;

-- 1. Revogar TODAS as sessões ativas
UPDATE user_sessions 
SET revoked = true 
WHERE revoked = false;

-- 2. Limpar códigos 2FA não utilizados (segurança)
UPDATE user_2fa_codes 
SET used = true 
WHERE used = false;

-- 3. Registrar evento no audit_logs
INSERT INTO audit_logs (
    user_id,
    action,
    resource_type,
    resource_id,
    details,
    ip_address,
    user_agent
)
SELECT 
    (SELECT id FROM users WHERE username = 'admin'),
    'FORCE_LOGOUT_ALL',
    'user_sessions',
    NULL,
    'Todas as sessões foram revogadas devido à correção de slugs na tabela system_features. Usuários precisam fazer login novamente para receber tokens com slugs atualizados.',
    '127.0.0.1',
    'PostgreSQL Migration Script'
FROM users
LIMIT 1;

COMMIT;

-- ================================================================
-- VERIFICAÇÃO
-- ================================================================
SELECT 
    'Sessões ativas ANTES da invalidação' as info,
    0 as total
UNION ALL
SELECT 
    'Sessões ativas APÓS invalidação' as info,
    COUNT(*)::integer as total
FROM user_sessions
WHERE revoked = false;

-- ================================================================
-- RESULTADO ESPERADO:
-- Sessões ativas ANTES: 0 (já foi executado)
-- Sessões ativas APÓS: 0 ✅
-- ================================================================


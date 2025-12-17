-- ============================================================
-- TESTE PRÁTICO DAS CORREÇÕES
-- ============================================================
-- Objetivo: Simular inserção na tabela email_logs para testar a correção
-- ============================================================

-- 1. Teste de inserção na tabela email_logs (simulando o EmailService)
INSERT INTO email_logs (template_name, to_email, success, message_id, error_message, sent_at)
VALUES ('2fa-code', 'teste@exemplo.com', true, 'test-message-id-123', null, NOW());

-- 2. Verificar se a inserção funcionou
SELECT 
    id,
    template_name,
    to_email,
    success,
    message_id,
    sent_at
FROM email_logs 
ORDER BY id DESC 
LIMIT 1;

-- 3. Teste de inserção na tabela audit_logs (simulando o logout)
INSERT INTO audit_logs (user_id, action, resource, resource_id, details, ip_address, user_agent, timestamp)
VALUES (
    'cc8220f7-a3fd-40ed-8dbd-a22539328083'::uuid, 
    'LOGOUT', 
    'AUTH', 
    1, 
    '{"username": "admin"}'::jsonb, 
    '192.168.1.100'::inet, 
    'Mozilla/5.0 Test Browser', 
    NOW()
);

-- 4. Verificar se a inserção funcionou
SELECT 
    user_id,
    action,
    resource,
    details,
    ip_address,
    timestamp
FROM audit_logs 
ORDER BY id DESC 
LIMIT 1;

-- 5. Limpar dados de teste
DELETE FROM email_logs WHERE template_name = '2fa-code' AND to_email = 'teste@exemplo.com';
DELETE FROM audit_logs WHERE action = 'LOGOUT' AND details->>'username' = 'admin';

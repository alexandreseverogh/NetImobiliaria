-- ============================================================
-- TESTE FINAL DAS CORREÇÕES
-- ============================================================
-- Objetivo: Verificar se as correções funcionam corretamente
-- ============================================================

-- 1. Teste de inserção na tabela email_logs (corrigido)
INSERT INTO email_logs (template_name, to_email, success, error_message, sent_at)
VALUES ('2fa-code', 'teste@exemplo.com', true, null, NOW());

-- 2. Verificar se a inserção funcionou
SELECT 
    id,
    template_name,
    to_email,
    success,
    error_message,
    sent_at
FROM email_logs 
ORDER BY id DESC 
LIMIT 1;

-- 3. Teste de inserção com erro
INSERT INTO email_logs (template_name, to_email, success, error_message, sent_at)
VALUES ('2fa-code', 'erro@exemplo.com', false, 'Erro de conexão SMTP', NOW());

-- 4. Verificar ambos os registros
SELECT 
    id,
    template_name,
    to_email,
    success,
    error_message,
    sent_at
FROM email_logs 
ORDER BY id DESC 
LIMIT 2;

-- 5. Limpar dados de teste
DELETE FROM email_logs WHERE template_name = '2fa-code' AND to_email IN ('teste@exemplo.com', 'erro@exemplo.com');

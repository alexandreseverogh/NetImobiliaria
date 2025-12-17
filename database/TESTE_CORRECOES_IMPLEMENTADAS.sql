-- ============================================================
-- TESTE DAS CORREÇÕES IMPLEMENTADAS
-- ============================================================
-- Objetivo: Verificar se as correções funcionam corretamente
-- ============================================================

-- 1. Verificar estrutura da tabela email_logs
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'email_logs' 
ORDER BY ordinal_position;

-- 2. Verificar se há registros na tabela email_logs
SELECT 
    COUNT(*) as total_logs,
    COUNT(CASE WHEN success = true THEN 1 END) as sucessos,
    COUNT(CASE WHEN success = false THEN 1 END) as erros
FROM email_logs;

-- 3. Verificar estrutura da tabela audit_logs
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'audit_logs' 
ORDER BY ordinal_position;

-- 4. Verificar logs de logout recentes
SELECT 
    user_id,
    action,
    details,
    ip_address,
    timestamp
FROM audit_logs 
WHERE action = 'LOGOUT' 
ORDER BY timestamp DESC 
LIMIT 5;

-- ========================================
-- CORREÇÃO DE CAMPOS DE AUDITORIA - GUARDIAN RULES
-- ========================================
-- 
-- Este script corrige os campos de auditoria para garantir
-- rastreabilidade completa conforme as Guardian Rules.
--
-- Data: 16/10/2025
-- Objetivo: Tornar campos obrigatórios para auditoria

-- 1. CORRIGIR CAMPO TIMESTAMP (tornar NOT NULL com valor padrão)
ALTER TABLE audit_logs 
ALTER COLUMN timestamp SET DEFAULT CURRENT_TIMESTAMP;

-- Atualizar registros existentes com timestamp NULL
UPDATE audit_logs 
SET timestamp = CURRENT_TIMESTAMP 
WHERE timestamp IS NULL;

-- Tornar timestamp NOT NULL
ALTER TABLE audit_logs 
ALTER COLUMN timestamp SET NOT NULL;

-- 2. VERIFICAR SE user_id DEVE SER OBRIGATÓRIO
-- NOTA: user_id pode ser NULL para operações do sistema
-- (ex: login automático, operações de sistema)
-- Portanto, mantemos como NULL mas adicionamos comentário

COMMENT ON COLUMN audit_logs.user_id IS 'ID do usuário que realizou a ação. NULL para operações do sistema.';

-- 3. ADICIONAR ÍNDICES PARA PERFORMANCE DE AUDITORIA
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);

-- 4. ADICIONAR CONSTRAINT PARA VALIDAÇÃO DE DADOS
ALTER TABLE audit_logs 
ADD CONSTRAINT chk_audit_action_not_empty 
CHECK (LENGTH(TRIM(action)) > 0);

ALTER TABLE audit_logs 
ADD CONSTRAINT chk_audit_resource_not_empty 
CHECK (LENGTH(TRIM(resource)) > 0);

-- 5. VERIFICAR RESULTADO DAS CORREÇÕES
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'audit_logs'
ORDER BY ordinal_position;

-- 6. TESTAR INSERÇÃO COM NOVOS CONSTRAINTS
INSERT INTO audit_logs (
    user_id, action, resource, resource_id, 
    details, ip_address, user_agent
) VALUES (
    NULL, 'GUARDIAN_RULES_COMPLIANCE', 'audit_system', NULL, 
    '{"message": "Campos de auditoria corrigidos conforme Guardian Rules"}', 
    '127.0.0.1', 'Guardian Rules Compliance Script'
);

-- 7. VERIFICAR LOG DE TESTE INSERIDO
SELECT 
    id, action, resource, timestamp, 
    details->>'message' as message
FROM audit_logs 
WHERE action = 'GUARDIAN_RULES_COMPLIANCE'
ORDER BY timestamp DESC 
LIMIT 1;

-- 8. LIMPAR LOG DE TESTE
DELETE FROM audit_logs 
WHERE action = 'GUARDIAN_RULES_COMPLIANCE';

-- ========================================
-- RESULTADO ESPERADO:
-- - timestamp: NOT NULL com valor padrão
-- - user_id: NULL permitido (operações do sistema)
-- - Índices criados para performance
-- - Constraints adicionados para validação
-- ========================================

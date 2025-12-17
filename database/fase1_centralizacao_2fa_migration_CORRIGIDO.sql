-- ================================================================
-- FASE 1: Centralizacao de 2FA com Suporte INTEGER (CORRIGIDO)
-- Data: 2025-01-06
-- Objetivo: Unificar tabelas de 2FA para suportar UUID (admin) e INTEGER (clientes/proprietarios)
-- ================================================================

-- ================================================================
-- CHECKPOINT 1: Adicionar Colunas (JA EXECUTADO - PULAR)
-- ================================================================
-- Colunas user_id_int e user_type ja foram adicionadas
-- Pulando para CHECKPOINT 2

-- ================================================================
-- CHECKPOINT 1B: Adicionar Colunas Faltantes em user_2fa_config
-- ================================================================

BEGIN;

-- Adicionar colunas que existem em clientes_2fa_config mas nao em user_2fa_config
ALTER TABLE user_2fa_config 
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
  ADD COLUMN IF NOT EXISTS secret_key VARCHAR(255),
  ADD COLUMN IF NOT EXISTS last_used TIMESTAMP;

-- Renomear coluna 'secret' para 'secret_key' se necessario
-- (ja existe como 'secret', vamos manter compativel)

COMMIT;

SELECT 'CHECKPOINT 1B COMPLETO: Colunas adicionadas';

-- ================================================================
-- CHECKPOINT 2: Migrar Dados das Tabelas Temporarias
-- ================================================================

BEGIN;

-- 2.1) Migrar dados de clientes_2fa_codes -> user_2fa_codes
INSERT INTO user_2fa_codes (
  user_id_int, 
  user_type, 
  code, 
  method, 
  expires_at, 
  used, 
  created_at, 
  ip_address, 
  user_agent
)
SELECT 
  user_id,
  'cliente'::VARCHAR(20),
  code,
  method,
  expires_at,
  used,
  created_at,
  ip_address,
  user_agent
FROM clientes_2fa_codes
WHERE NOT EXISTS (
  SELECT 1 FROM user_2fa_codes 
  WHERE user_2fa_codes.user_id_int = clientes_2fa_codes.user_id 
  AND user_2fa_codes.user_type = 'cliente'
);

-- 2.2) Migrar dados de clientes_2fa_config -> user_2fa_config
INSERT INTO user_2fa_config (
  user_id_int,
  user_type,
  method,
  email,
  phone_number,
  secret_key,
  is_enabled,
  backup_codes,
  last_used,
  created_at,
  updated_at
)
SELECT 
  user_id,
  'cliente'::VARCHAR(20),
  method,
  email,
  phone_number,
  secret_key,
  is_enabled,
  backup_codes,
  last_used,
  created_at,
  updated_at
FROM clientes_2fa_config
WHERE NOT EXISTS (
  SELECT 1 FROM user_2fa_config 
  WHERE user_2fa_config.user_id_int = clientes_2fa_config.user_id 
  AND user_2fa_config.user_type = 'cliente'
);

-- 2.3) Migrar dados de proprietarios_2fa_codes -> user_2fa_codes
INSERT INTO user_2fa_codes (
  user_id_int,
  user_type,
  code,
  method,
  expires_at,
  used,
  created_at,
  ip_address,
  user_agent
)
SELECT 
  user_id,
  'proprietario'::VARCHAR(20),
  code,
  method,
  expires_at,
  used,
  created_at,
  ip_address,
  user_agent
FROM proprietarios_2fa_codes
WHERE NOT EXISTS (
  SELECT 1 FROM user_2fa_codes 
  WHERE user_2fa_codes.user_id_int = proprietarios_2fa_codes.user_id 
  AND user_2fa_codes.user_type = 'proprietario'
);

-- 2.4) Migrar dados de proprietarios_2fa_config -> user_2fa_config
INSERT INTO user_2fa_config (
  user_id_int,
  user_type,
  method,
  email,
  phone_number,
  secret_key,
  is_enabled,
  backup_codes,
  last_used,
  created_at,
  updated_at
)
SELECT 
  user_id,
  'proprietario'::VARCHAR(20),
  method,
  email,
  phone_number,
  secret_key,
  is_enabled,
  backup_codes,
  last_used,
  created_at,
  updated_at
FROM proprietarios_2fa_config
WHERE NOT EXISTS (
  SELECT 1 FROM user_2fa_config 
  WHERE user_2fa_config.user_id_int = proprietarios_2fa_config.user_id 
  AND user_2fa_config.user_type = 'proprietario'
);

COMMIT;

SELECT 'CHECKPOINT 2 COMPLETO: Dados migrados';

-- ================================================================
-- CHECKPOINT 3: Centralizar Logs de Auditoria
-- ================================================================

BEGIN;

-- 3.1) Adicionar colunas em audit_logs (se ainda nao existem)
ALTER TABLE audit_logs 
  ADD COLUMN IF NOT EXISTS user_id_int INTEGER,
  ADD COLUMN IF NOT EXISTS user_type VARCHAR(20);

-- 3.2) Criar indices para performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_type ON audit_logs(user_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_int ON audit_logs(user_id_int);
CREATE INDEX IF NOT EXISTS idx_audit_logs_composite ON audit_logs(user_id_int, user_type);

-- 3.3) Migrar logs de audit_2fa_logs_public -> audit_logs
INSERT INTO audit_logs (
  user_id_int,
  user_type,
  action,
  resource,
  resource_id,
  details,
  ip_address,
  user_agent,
  timestamp
)
SELECT 
  user_id,
  user_type,
  action,
  '2FA',
  NULL,
  metadata::TEXT,
  NULL,
  NULL,
  created_at
FROM audit_2fa_logs_public
WHERE NOT EXISTS (
  SELECT 1 FROM audit_logs 
  WHERE audit_logs.user_id_int = audit_2fa_logs_public.user_id 
  AND audit_logs.user_type = audit_2fa_logs_public.user_type
  AND audit_logs.timestamp = audit_2fa_logs_public.created_at
);

-- 3.4) Atualizar user_type para 'admin' em logs existentes sem user_type
UPDATE audit_logs 
SET user_type = 'admin' 
WHERE user_type IS NULL AND user_id IS NOT NULL;

COMMIT;

SELECT 'CHECKPOINT 3 COMPLETO: Logs centralizados';

-- ================================================================
-- VERIFICACOES FINAIS
-- ================================================================

SELECT '================================';
SELECT 'MIGRACAO COMPLETA - ESTATISTICAS:';
SELECT '================================';

SELECT 'Codigos 2FA Clientes:', COUNT(*) 
FROM user_2fa_codes WHERE user_type = 'cliente';

SELECT 'Codigos 2FA Proprietarios:', COUNT(*) 
FROM user_2fa_codes WHERE user_type = 'proprietario';

SELECT 'Configs 2FA Clientes:', COUNT(*) 
FROM user_2fa_config WHERE user_type = 'cliente';

SELECT 'Configs 2FA Proprietarios:', COUNT(*) 
FROM user_2fa_config WHERE user_type = 'proprietario';

SELECT 'Logs Auditoria Publico:', COUNT(*) 
FROM audit_logs WHERE user_type IN ('cliente', 'proprietario');

SELECT '================================';

-- ================================================================
-- FIM DA MIGRACAO FASE 1
-- NAO deletar tabelas temporarias ainda - aguardar validacao!
-- ================================================================



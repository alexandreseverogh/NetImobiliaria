-- Migration: PIN de aprovação para ações ofensivas do agente
-- Adicionado 2026-06-22

ALTER TABLE campanhasmarketingdigital."AgentAction"
  ADD COLUMN IF NOT EXISTS approval_pin     VARCHAR(6),
  ADD COLUMN IF NOT EXISTS approval_pin_exp TIMESTAMPTZ;

COMMENT ON COLUMN campanhasmarketingdigital."AgentAction".approval_pin IS
  'PIN de 6 dígitos enviado no WhatsApp; obrigatório para aprovar ações ofensivas';
COMMENT ON COLUMN campanhasmarketingdigital."AgentAction".approval_pin_exp IS
  'Expiração do PIN (default: 24h após criação da ação)';

-- 🔧 ADICIONAR COLUNA DE EXPIRAÇÃO DE SLA NA STAGING (Lead Router)
-- Objetivo: Suportar o monitoramento de transbordo automatizado via Cron.
-- Autor: Antigravity

-- Adicionar coluna de expiração para controle de SLA do corretor
ALTER TABLE leads_staging 
    ADD COLUMN IF NOT EXISTS atribuicao_expira_em TIMESTAMP WITH TIME ZONE;

-- Índice para performance nas buscas do Cron (transbordo)
CREATE INDEX IF NOT EXISTS idx_leads_staging_expiracao ON leads_staging(atribuicao_expira_em) 
WHERE (corretor_atribuido_id IS NOT NULL AND status != 'aceito');

-- Registrar auditoria de alteração
COMMENT ON COLUMN leads_staging.atribuicao_expira_em IS 'Data/Hora limite para o corretor aceitar o lead antes do transbordo';

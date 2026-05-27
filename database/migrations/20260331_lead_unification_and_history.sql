-- ==============================================================
-- MIGRAÇÃO DE UNIFICAÇÃO DE LEADS E HISTÓRICO DE ATRIBUIÇÕES
-- Data: 31/03/2026
-- ==============================================================

-- 1. Tabela de Histórico de Atribuições para Leads de CRM (Staging)
-- Essencial para evitar "loops" no transbordo regional e auditoria de SLAs.
CREATE TABLE IF NOT EXISTS public.leads_staging_atribuicoes (
    id SERIAL PRIMARY KEY,
    lead_uuid UUID NOT NULL,
    corretor_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'atribuido', -- 'atribuido', 'aceito', 'recusado', 'expirado'
    motivo JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Índice de Unificação de Leads (Evita duplicidade Site + CRM para o mesmo imóvel)
-- Permite o uso de "ON CONFLICT (email, imovel_id) DO UPDATE"
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_staging_unificacao 
ON public.leads_staging (email, imovel_id) 
WHERE email IS NOT NULL AND imovel_id IS NOT NULL;

-- 3. Garantir que a tabela leads_staging tenha as colunas necessárias
-- (Executado de forma segura, adiciona apenas se não existir)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads_staging' AND column_name='imovel_id') THEN
        ALTER TABLE leads_staging ADD COLUMN imovel_id INTEGER;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads_staging' AND column_name='tag_sonho') THEN
        ALTER TABLE leads_staging ADD COLUMN tag_sonho VARCHAR(255) DEFAULT 'A Definir';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='leads_staging' AND column_name='atribuicao_expira_em') THEN
        ALTER TABLE leads_staging ADD COLUMN atribuicao_expira_em TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

COMMENT ON TABLE leads_staging_atribuicoes IS 'Histórico de tentativas de atendimento para leads do CRM (Staging/IA).';

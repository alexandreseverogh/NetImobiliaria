CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================
-- 1. PILAR DE CICLOS (TIME-IN-STAGE)
-- =========================================================

CREATE TABLE IF NOT EXISTS leads_kanban_ciclos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_uuid UUID NOT NULL REFERENCES leads_staging(lead_uuid) ON DELETE CASCADE,
    coluna_id INT NOT NULL REFERENCES kanban_colunas(id) ON DELETE CASCADE,
    data_entrada TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_saida TIMESTAMP WITH TIME ZONE
);

CREATE OR REPLACE FUNCTION trg_log_kanban_ciclos()
RETURNS TRIGGER AS $$
BEGIN
    -- Gatilho nativo para registrar o ciclo histórico imune a bugs de backend.
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO leads_kanban_ciclos (lead_uuid, coluna_id, data_entrada) 
        VALUES (NEW.lead_uuid, NEW.coluna_id, NOW());
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE' AND OLD.coluna_id IS DISTINCT FROM NEW.coluna_id) THEN
        UPDATE leads_kanban_ciclos
        SET data_saida = NOW()
        WHERE lead_uuid = OLD.lead_uuid AND coluna_id = OLD.coluna_id AND data_saida IS NULL;
        
        INSERT INTO leads_kanban_ciclos (lead_uuid, coluna_id, data_entrada) 
        VALUES (NEW.lead_uuid, NEW.coluna_id, NOW());
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_kanban_ciclos_trigger ON leads_kanban;

CREATE TRIGGER leads_kanban_ciclos_trigger
AFTER INSERT OR UPDATE ON leads_kanban
FOR EACH ROW EXECUTE FUNCTION trg_log_kanban_ciclos();

-- Inicializa o ciclo base para os leads já existentes na base que estão na coluna atual.
INSERT INTO leads_kanban_ciclos (lead_uuid, coluna_id, data_entrada)
SELECT lead_uuid, coluna_id, data_captacao
FROM leads_kanban k
LEFT JOIN (SELECT lead_uuid as stg_lead_uuid, created_at as data_captacao FROM leads_staging) s ON s.stg_lead_uuid = k.lead_uuid
WHERE NOT EXISTS (SELECT 1 FROM leads_kanban_ciclos c WHERE c.lead_uuid = k.lead_uuid)
ON CONFLICT DO NOTHING;

-- =========================================================
-- 2. PILAR DE ROI DE MARKETING E ESTRATÉGIA
-- =========================================================

CREATE TABLE IF NOT EXISTS marketing_campanhas_orcamento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    utm_campaign VARCHAR(255) NOT NULL,
    plataforma VARCHAR(100),
    publico_alvo VARCHAR(255),
    periodo_faixa_horaria JSONB DEFAULT '[]'::jsonb, -- Armazena arrays flexiveis [ "18:00 - 23:00 Seg/Sex" ]
    data_inicio DATE NOT NULL,
    data_fim DATE,
    valor_investido_brl DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_orc_campaign ON marketing_campanhas_orcamento(utm_campaign);

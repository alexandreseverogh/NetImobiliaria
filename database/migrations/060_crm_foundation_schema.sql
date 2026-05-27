-- Migration: 060_crm_foundation_schema.sql
-- Objetivo: Criar a infraestrutura de dados para a Fase 1 do CRM Real Estate Intelligence

BEGIN;

-- 1. TABELA DE COLUNAS DO KANBAN (DINÂMICA)
CREATE TABLE IF NOT EXISTS kanban_colunas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    titulo_exibicao VARCHAR(150) NOT NULL,
    descricao TEXT,
    ordem INTEGER NOT NULL,
    cor VARCHAR(7) DEFAULT '#3B82F6',
    icone VARCHAR(50),
    ativa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Popular colunas iniciais do funil (conforme o PRD e Plano de Ação)
INSERT INTO kanban_colunas (nome, titulo_exibicao, ordem, cor, icone) VALUES
('lead_captado', 'Lead Captado', 1, '#94A3B8', 'InboxIcon'),
('entendimento_dor', 'Entendimento da Dor', 2, '#3B82F6', 'ChatBubbleBottomCenterTextIcon'),
('em_curadoria', 'Em Curadoria', 3, '#F59E0B', 'MagnifyingGlassIcon'),
('visita_agendada', 'Visita Agendada', 4, '#10B981', 'CalendarIcon'),
('proposta_enviada', 'Proposta Enviada', 5, '#8B5CF6', 'DocumentTextIcon'),
('fechamento', 'Fechamento/Conquista', 6, '#059669', 'TrophyIcon'),
('perdido', 'Perdido', 7, '#EF4444', 'XCircleIcon')
ON CONFLICT (nome) DO NOTHING;

-- 2. TABELA DE LEADS STAGING (CAPTAÇÃO BRUTA E IA)
CREATE TABLE IF NOT EXISTS leads_staging (
    lead_uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(255),
    email VARCHAR(255),
    telefone VARCHAR(20),
    status VARCHAR(50) DEFAULT 'lead_captado',
    score_prontidao INTEGER DEFAULT 0, -- 0 a 100
    tag_sonho VARCHAR(100), -- Ex: "Fim do Aluguel", "Porto Seguro"
    ipve_alvo DECIMAL(5,2),
    venda_casada_ativa BOOLEAN DEFAULT FALSE,
    raw_json JSONB, -- Dados brutos vindos das APIs (Meta, WhatsApp, etc)
    resumo_ia TEXT, -- Resumo gerado pela IA "Concierge"
    corretor_atribuido_id UUID REFERENCES users(id) ON DELETE SET NULL,
    atribuido_em TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABELA DE RELACIONAMENTO LEADS X KANBAN
CREATE TABLE IF NOT EXISTS leads_kanban (
    id SERIAL PRIMARY KEY,
    lead_uuid UUID REFERENCES leads_staging(lead_uuid) ON DELETE CASCADE,
    coluna_id INTEGER REFERENCES kanban_colunas(id) ON DELETE RESTRICT,
    ordem INTEGER DEFAULT 0,
    motivo_perda TEXT,
    data_movimentacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    movido_por UUID REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(lead_uuid) -- Um lead só está em um lugar por vez
);

-- 4. TABELA DE EVENTOS DE MARKETING (ATRIBUIÇÃO)
CREATE TABLE IF NOT EXISTS marketing_eventos (
    id SERIAL PRIMARY KEY,
    lead_uuid UUID REFERENCES leads_staging(lead_uuid) ON DELETE CASCADE,
    utm_source VARCHAR(100),
    utm_medium VARCHAR(100),
    utm_campaign VARCHAR(100),
    utm_content VARCHAR(100),
    utm_term VARCHAR(100),
    fbclid VARCHAR(255),
    gclid VARCHAR(255),
    fbp VARCHAR(255),
    fbc VARCHAR(255),
    creative_id VARCHAR(100),
    plataforma VARCHAR(50), -- 'meta', 'google', 'site'
    referencia_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABELA DE CONSENTIMENTOS (LGPD)
CREATE TABLE IF NOT EXISTS consentimentos_lead (
    id SERIAL PRIMARY KEY,
    lead_uuid UUID REFERENCES leads_staging(lead_uuid) ON DELETE CASCADE,
    origem VARCHAR(50) NOT NULL,
    consent_marketing BOOLEAN DEFAULT FALSE,
    consent_comunicacao BOOLEAN DEFAULT FALSE,
    ip_registro VARCHAR(45),
    user_agent TEXT,
    data_consentimento TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. ÍNDICES DE PERFORMANCE (MANDATÓRIOS GUARDIAN RULES)
CREATE INDEX IF NOT EXISTS idx_leads_staging_email ON leads_staging(email);
CREATE INDEX IF NOT EXISTS idx_leads_staging_telefone ON leads_staging(telefone);
CREATE INDEX IF NOT EXISTS idx_leads_staging_corretor ON leads_staging(corretor_atribuido_id);
CREATE INDEX IF NOT EXISTS idx_marketing_lead_uuid ON marketing_eventos(lead_uuid);
CREATE INDEX IF NOT EXISTS idx_leads_kanban_coluna ON leads_kanban(coluna_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_leads_staging_updated_at BEFORE UPDATE ON leads_staging FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_kanban_colunas_updated_at BEFORE UPDATE ON kanban_colunas FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

COMMIT;

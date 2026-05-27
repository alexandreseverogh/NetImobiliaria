-- 🔧 ADICIONAR COLUNAS DE GEOLOCALIZAÇÃO NA STAGING (Lead Router)
-- Objetivo: Suportar o roteamento de leads genéricos por área de atuação.
-- Autor: Antigravity
-- Nota: Colunas adicionadas sem REFERENCES para manter compatibilidade com o esquema atual (que usa strings para UF e Cidade).

-- Adicionar colunas de estado e cidade
ALTER TABLE leads_staging 
    ADD COLUMN IF NOT EXISTS estado_fk VARCHAR(2),
    ADD COLUMN IF NOT EXISTS cidade_fk VARCHAR(255);

-- Índices para performance nas buscas por área de atuação do Lead Router
CREATE INDEX IF NOT EXISTS idx_leads_staging_geo ON leads_staging(estado_fk, cidade_fk);

-- Registrar auditoria de alteração
COMMENT ON COLUMN leads_staging.estado_fk IS 'Sigla do Estado (UF) para roteamento geográfico';
COMMENT ON COLUMN leads_staging.cidade_fk IS 'Nome da Cidade para roteamento geográfico';

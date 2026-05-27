-- 🔧 ADICIONAR VÍNCULO DE IMÓVEL À STAGING
-- Objetivo: Garantir que leads de redes sociais apontem para o dono da captação
ALTER TABLE leads_staging ADD COLUMN IF NOT EXISTS imovel_id INTEGER REFERENCES imoveis(id) ON DELETE SET NULL;

-- Índice para performance de busca por imóvel
CREATE INDEX IF NOT EXISTS idx_leads_staging_imovel ON leads_staging(imovel_id);

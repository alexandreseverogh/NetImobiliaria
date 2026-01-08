-- Migração de Resgate: Adicionar colunas faltantes na tabela parametros
-- Essas colunas existiam no banco local mas não tinham migração registrada

ALTER TABLE parametros ADD COLUMN IF NOT EXISTS valor_corretor NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS chave_pix_corretor VARCHAR(255);
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS cidade_beneficiario_recebimento_corretor VARCHAR(255) DEFAULT 'BRASILIA';
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS valor_mensal_imovel NUMERIC(10,2) DEFAULT 0.00;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS qtde_anuncios_imoveis_corretor INTEGER DEFAULT 5;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS periodo_anuncio_corretor INTEGER DEFAULT 30;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS proximos_corretores_recebem_leads INTEGER DEFAULT 3;
ALTER TABLE parametros ADD COLUMN IF NOT EXISTS sla_minutos_aceite_lead INTEGER DEFAULT 5;

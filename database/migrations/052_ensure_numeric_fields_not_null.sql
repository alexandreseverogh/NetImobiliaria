-- Migration 052: Garantir que campos numéricos na tabela imoveis nunca sejam nulos
-- Propósito: Definir valor padrão 0 e restrição NOT NULL para campos de preço, área e quantidades

-- Atualizar registros nulos existentes para 0
UPDATE imoveis SET 
  preco = COALESCE(preco, 0),
  preco_condominio = COALESCE(preco_condominio, 0),
  preco_iptu = COALESCE(preco_iptu, 0),
  area_total = COALESCE(area_total, 0),
  area_construida = COALESCE(area_construida, 0),
  quartos = COALESCE(quartos, 0),
  banheiros = COALESCE(banheiros, 0),
  vagas_garagem = COALESCE(vagas_garagem, 0);

-- Alterar as colunas para adicionar o valor padrão e a restrição NOT NULL
ALTER TABLE imoveis 
  ALTER COLUMN preco SET DEFAULT 0,
  ALTER COLUMN preco SET NOT NULL,
  ALTER COLUMN preco_condominio SET DEFAULT 0,
  ALTER COLUMN preco_condominio SET NOT NULL,
  ALTER COLUMN preco_iptu SET DEFAULT 0,
  ALTER COLUMN preco_iptu SET NOT NULL,
  ALTER COLUMN area_total SET DEFAULT 0,
  ALTER COLUMN area_total SET NOT NULL,
  ALTER COLUMN area_construida SET DEFAULT 0,
  ALTER COLUMN area_construida SET NOT NULL,
  ALTER COLUMN quartos SET DEFAULT 0,
  ALTER COLUMN quartos SET NOT NULL,
  ALTER COLUMN banheiros SET DEFAULT 0,
  ALTER COLUMN banheiros SET NOT NULL,
  ALTER COLUMN vagas_garagem SET DEFAULT 0,
  ALTER COLUMN vagas_garagem SET NOT NULL;

-- Miniaturas dos criativos (lista) separadas das imagens originais (modal).
-- Aditiva e idempotente: nenhum dado existente é alterado.
ALTER TABLE campanhasmarketingdigital."Ad"
  ADD COLUMN IF NOT EXISTS thumbnails TEXT[] NOT NULL DEFAULT '{}';

-- 036_add_ativo_to_financiamento_patrocinadores.sql
-- Garante a coluna "ativo" (para controle de exibição no "Tenho Interesse"),
-- mesmo em ambientes onde a tabela foi criada anteriormente sem esse campo.

ALTER TABLE public.financiamento_patrocinadores
ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

-- Índice para seleção eficiente dos "top 8" ativos por valor_mensal
CREATE INDEX IF NOT EXISTS idx_financiamento_patrocinadores_ativo_valor
  ON public.financiamento_patrocinadores (ativo, valor_mensal DESC, id DESC);



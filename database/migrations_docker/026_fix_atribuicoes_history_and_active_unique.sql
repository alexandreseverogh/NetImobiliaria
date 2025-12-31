-- 026_fix_atribuicoes_history_and_active_unique.sql
-- Permite histórico de atribuições por prospect (várias tentativas),
-- garantindo apenas 1 atribuição "ativa" por prospect (atribuido/aceito).

DO $$
BEGIN
  -- Remover UNIQUE(prospect_id) antigo (constraint) se existir
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_imovel_prospect_atribuicoes_prospect_id') THEN
    ALTER TABLE public.imovel_prospect_atribuicoes
      DROP CONSTRAINT uq_imovel_prospect_atribuicoes_prospect_id;
  END IF;
END $$;

-- Criar índice único parcial para status ativos
CREATE UNIQUE INDEX IF NOT EXISTS uq_imovel_prospect_atribuicoes_active_prospect
  ON public.imovel_prospect_atribuicoes (prospect_id)
  WHERE status IN ('atribuido', 'aceito');



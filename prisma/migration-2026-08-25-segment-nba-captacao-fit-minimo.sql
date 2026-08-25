-- Parâmetro por segmento: aderência mínima (score_fit, escala 0-100, mesma do que é
-- persistido em leads_staging.score_fit) pra disparar a "Sugestão da IA" (next_best_action)
-- automaticamente já na captação do lead, sem esperar mudança de etapa. NULL = desativado
-- (comportamento atual preservado por padrão pra todo segmento existente) — nunca dispara
-- sem um valor explícito configurado pelo Master, evita gasto de LLM em lead frio por
-- omissão.
ALTER TABLE public.system_segments
  ADD COLUMN IF NOT EXISTS next_best_action_captacao_fit_minimo INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'system_segments_nba_captacao_fit_minimo_range'
  ) THEN
    ALTER TABLE public.system_segments
      ADD CONSTRAINT system_segments_nba_captacao_fit_minimo_range
      CHECK (next_best_action_captacao_fit_minimo IS NULL
         OR (next_best_action_captacao_fit_minimo BETWEEN 0 AND 100));
  END IF;
END $$;

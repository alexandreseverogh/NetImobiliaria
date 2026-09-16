-- Distingue "atividade sugerida pela IA, registrada por um humano" (NextBestActionCard —
-- "Registrar como Atividade") de origem='ia' (atividade executada pela própria IA, sem
-- humano no meio — bot/reativação automática). São conceitos diferentes: aqui o humano
-- sempre clica "Salvar", só o CONTEÚDO nasceu de uma sugestão. Aditiva, default false —
-- nenhuma atividade existente muda de significado.
ALTER TABLE public.atividades_lead
  ADD COLUMN IF NOT EXISTS sugerido_por_ia BOOLEAN NOT NULL DEFAULT false;

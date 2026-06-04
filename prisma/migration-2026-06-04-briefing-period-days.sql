-- FASE — Briefing autônomo do filtro de página
-- Adiciona period_days ao StrategicBriefing para cada briefing carregar seu
-- próprio período de geração (independente do filtro da página do dashboard).

ALTER TABLE campanhasmarketingdigital."StrategicBriefing"
  ADD COLUMN IF NOT EXISTS period_days INTEGER;

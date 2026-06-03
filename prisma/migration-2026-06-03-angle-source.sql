-- FASE 14d: fonte do ângulo de comunicação
-- Rastreia como o ângulo foi definido:
--   'declared'  = declarado manualmente pelo usuário
--   'llm_auto'  = classificado automaticamente pela IA (batch job)
--   NULL        = sem classificação

ALTER TABLE campanhasmarketingdigital."Campaign"
ADD COLUMN IF NOT EXISTS angle_source VARCHAR(20);

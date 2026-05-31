-- =============================================================================
-- FASE 7 — Funnel Stage Classification
-- Data: 2026-05-31
-- Descrição: classifica campanhas em estágios do funil (TOF/MOF/BOF),
--            habilita diagnóstico de gargalo via LLM.
-- =============================================================================

-- 1. Nova coluna em Campaign
ALTER TABLE campanhasmarketingdigital."Campaign"
  ADD COLUMN IF NOT EXISTS funnel_stage VARCHAR(20) DEFAULT 'TOF';

-- 2. Índice para filtros por estágio + tenant
CREATE INDEX IF NOT EXISTS idx_campaign_funnel
  ON campanhasmarketingdigital."Campaign" (funnel_stage, tenant_id);

-- 3. Backfill automático baseado no objective
UPDATE campanhasmarketingdigital."Campaign"
SET funnel_stage = CASE
  WHEN objective IN ('OUTCOME_AWARENESS', 'OUTCOME_TRAFFIC', 'OUTCOME_REACH')        THEN 'TOF'
  WHEN objective IN ('OUTCOME_ENGAGEMENT')                                             THEN 'MOF'
  WHEN objective IN ('OUTCOME_LEADS', 'OUTCOME_SALES', 'OUTCOME_APP_PROMOTION',
                     'OUTCOME_CONVERSIONS')                                            THEN 'BOF'
  ELSE 'TOF'
END
WHERE funnel_stage IS NULL OR funnel_stage = 'TOF';

-- 4. Seed do prompt template para diagnóstico de funil
INSERT INTO public.system_prompt_templates
  (segment_id, template_key, version, title, content, variables, is_active)
VALUES
  (NULL, 'funnel_diagnosis', 1,
   'Diagnóstico de Funil de Marketing',
   'Você é especialista em funil de marketing digital no segmento {{segment}}.

DADOS DO FUNIL — período {{period}}:
{{funnel_data}}

TAXAS DE CONVERSÃO ENTRE ESTÁGIOS:
{{conversion_rates}}

Com base nesses dados:
1. Identifique o principal gargalo do funil (onde há maior queda de conversão)
2. Escreva um diagnóstico objetivo em 2-3 frases sobre a saúde do funil
3. Liste 2-3 ações prioritárias para melhorar os resultados

Responda em português do Brasil, de forma direta e acionável. Máximo 180 palavras.',
   '["segment","period","funnel_data","conversion_rates"]',
   true)
ON CONFLICT DO NOTHING;

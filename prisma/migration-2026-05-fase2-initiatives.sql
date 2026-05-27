-- FASE 2: Marketing Initiatives
-- Idempotent migration — safe to re-run

-- ============================================================
-- 1. MarketingInitiative table
-- ============================================================
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."MarketingInitiative" (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id             UUID NOT NULL,
  client_id             UUID REFERENCES public.clientes(uuid) ON DELETE SET NULL,
  name                  VARCHAR(200) NOT NULL,
  description           TEXT,
  goal_description      TEXT,
  total_budget_planned  DECIMAL(12,2),
  start_date            DATE,
  end_date              DATE,
  status                VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
  primary_kpi           VARCHAR(40),
  primary_kpi_target    DECIMAL,
  created_at            TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at            TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_by            UUID
);

CREATE INDEX IF NOT EXISTS idx_initiative_tenant
  ON campanhasmarketingdigital."MarketingInitiative"(tenant_id, status);

CREATE INDEX IF NOT EXISTS idx_initiative_client
  ON campanhasmarketingdigital."MarketingInitiative"(client_id);

-- ============================================================
-- 2. Link Campaign → Initiative (optional FK)
-- ============================================================
ALTER TABLE campanhasmarketingdigital."Campaign"
  ADD COLUMN IF NOT EXISTS initiative_id UUID
  REFERENCES campanhasmarketingdigital."MarketingInitiative"(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_initiative
  ON campanhasmarketingdigital."Campaign"(initiative_id);

-- ============================================================
-- 3. Prompt template: initiative_consolidated_briefing
-- ============================================================
INSERT INTO public.system_prompt_templates
  (segment_id, template_key, version, title, content, variables, is_active)
VALUES (
  NULL,
  'initiative_consolidated_briefing',
  1,
  'Briefing Consolidado de Iniciativa',
  E'Você é um especialista em marketing digital imobiliário. Analise a seguinte iniciativa de marketing e gere um briefing consolidado estratégico.\n\n## Iniciativa\n- **Nome:** {{initiative_name}}\n- **Objetivo:** {{goal_description}}\n- **Período:** {{start_date}} a {{end_date}}\n- **Orçamento planejado:** R$ {{total_budget_planned}}\n- **Orçamento gasto até agora:** R$ {{total_spent}}\n- **KPI Principal:** {{primary_kpi}} (meta: {{primary_kpi_target}})\n\n## Campanhas Vinculadas ({{campaign_count}} campanhas)\n{{campaigns_summary}}\n\n## Métricas Consolidadas (últimos 30 dias)\n- Impressões: {{total_impressions}}\n- Cliques: {{total_clicks}}\n- Leads: {{total_leads}}\n- CTR médio: {{avg_ctr}}%\n- CPL médio: R$ {{avg_cpl}}\n- CPC médio: R$ {{avg_cpc}}\n- Gasto total: R$ {{total_spend}}\n\n## Benchmarks do Segmento\n- CPL benchmark: R$ {{benchmark_cpl}}\n- CTR benchmark: {{benchmark_ctr}}%\n\nCom base nesses dados, forneça:\n1. **Resumo Executivo** (3-4 linhas): estado geral da iniciativa vs. metas\n2. **Análise de Performance**: o que está funcionando, o que precisa de atenção\n3. **Eficiência de Budget**: ritmo de gasto, projeção até o fim da iniciativa\n4. **Top 3 Recomendações**: ações concretas para os próximos 7 dias\n5. **Alerta de Risco**: identifique riscos de não atingir o KPI principal\n\nResposta em português brasileiro, tom profissional mas direto.',
  '["initiative_name","goal_description","start_date","end_date","total_budget_planned","total_spent","primary_kpi","primary_kpi_target","campaign_count","campaigns_summary","total_impressions","total_clicks","total_leads","avg_ctr","avg_cpl","avg_cpc","total_spend","benchmark_cpl","benchmark_ctr"]'::jsonb,
  true
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 4. Record migration
-- ============================================================
INSERT INTO public.schema_migrations (filename, applied_at)
VALUES ('migration-2026-05-fase2-initiatives.sql', now())
ON CONFLICT DO NOTHING;

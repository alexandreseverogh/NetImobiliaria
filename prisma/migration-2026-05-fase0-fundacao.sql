-- ============================================================
-- FASE 0 — Fundação Multi-Segmento + Gestão de Prompts
-- Arquivo: prisma/migration-2026-05-fase0-fundacao.sql
-- Execução:
--   docker exec -i netimobiliaria-db psql -U postgres -d net_imobiliaria \
--     < prisma/migration-2026-05-fase0-fundacao.sql
-- IDEMPOTENTE: pode ser re-executado sem efeitos colaterais
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1. Enriquecer system_segments com colunas de inteligência
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.system_segments
  ADD COLUMN IF NOT EXISTS vocabulary        JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS funnel_stages     JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS creative_taxonomy JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS primary_kpis      JSONB NOT NULL DEFAULT '[]';

-- ────────────────────────────────────────────────────────────
-- 2. Adicionar segment_id à tabela clientes
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS segment_id UUID REFERENCES public.system_segments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clientes_segment_id ON public.clientes (segment_id);

-- ────────────────────────────────────────────────────────────
-- 3. Criar system_prompt_templates
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_prompt_templates (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id    UUID        REFERENCES public.system_segments(id) ON DELETE CASCADE,
  template_key  VARCHAR(100) NOT NULL,
  version       INTEGER     NOT NULL DEFAULT 1,
  title         VARCHAR(255) NOT NULL,
  content       TEXT        NOT NULL,
  variables     JSONB       NOT NULL DEFAULT '[]',
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prompt_templates_key_segment
  ON public.system_prompt_templates (template_key, segment_id);

-- NULL segment_id = template global (fallback para todos os segmentos)
CREATE UNIQUE INDEX IF NOT EXISTS idx_prompt_templates_global_unique
  ON public.system_prompt_templates (template_key, version)
  WHERE segment_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_prompt_templates_segment_unique
  ON public.system_prompt_templates (segment_id, template_key, version)
  WHERE segment_id IS NOT NULL;

COMMENT ON COLUMN public.system_prompt_templates.segment_id IS
  'NULL = template global (fallback). Preenchido = template específico do segmento.';
COMMENT ON COLUMN public.system_prompt_templates.variables IS
  'Array de strings com os nomes das variáveis {{var}} esperadas no content.';

-- ────────────────────────────────────────────────────────────
-- 4. Criar system_benchmarks (padrões por segmento)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.system_benchmarks (
  id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id   UUID         NOT NULL REFERENCES public.system_segments(id) ON DELETE CASCADE,
  metric_key   VARCHAR(100) NOT NULL,
  metric_label VARCHAR(255) NOT NULL,
  value        NUMERIC(12,4) NOT NULL,
  unit         VARCHAR(20)  NOT NULL DEFAULT 'BRL',
  description  TEXT,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (segment_id, metric_key)
);

CREATE INDEX IF NOT EXISTS idx_benchmarks_segment ON public.system_benchmarks (segment_id);

-- ────────────────────────────────────────────────────────────
-- 5. Criar tenant_benchmark_overrides (camada 2 da resolução)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tenant_benchmark_overrides (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  metric_key VARCHAR(100) NOT NULL,
  value      NUMERIC(12,4) NOT NULL,
  note       TEXT,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, metric_key)
);

CREATE INDEX IF NOT EXISTS idx_tenant_benchmarks_tenant
  ON public.tenant_benchmark_overrides (tenant_id);

-- ────────────────────────────────────────────────────────────
-- 6. Criar client_benchmark_overrides (camada 1 da resolução)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_benchmark_overrides (
  id         UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id  UUID         NOT NULL REFERENCES public.clientes(uuid) ON DELETE CASCADE,
  tenant_id  UUID         NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  metric_key VARCHAR(100) NOT NULL,
  value      NUMERIC(12,4) NOT NULL,
  note       TEXT,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  UNIQUE (client_id, metric_key)
);

CREATE INDEX IF NOT EXISTS idx_client_benchmarks_client
  ON public.client_benchmark_overrides (client_id);
CREATE INDEX IF NOT EXISTS idx_client_benchmarks_tenant
  ON public.client_benchmark_overrides (tenant_id);

-- ────────────────────────────────────────────────────────────
-- 7. Seeds — Vocabulário e KPIs por segmento
-- ────────────────────────────────────────────────────────────

-- Imobiliário
UPDATE public.system_segments SET
  vocabulary = '{
    "product": "imóvel",
    "products": "imóveis",
    "product_types": ["apartamento", "casa", "terreno", "sala comercial", "galpão"],
    "lead_term": "interessado",
    "conversion_term": "visita",
    "currency": "BRL",
    "audience_terms": ["comprador", "investidor", "família em busca de imóvel"],
    "pain_points": ["localização", "financiamento", "metragem", "condomínio"],
    "cta_terms": ["Ver imóvel", "Quero saber mais", "Agendar visita", "Falar com corretor"]
  }'::jsonb,
  funnel_stages = '[
    {"key": "awareness",     "label": "Conscientização",    "kpi": "reach",           "objective": "BRAND_AWARENESS"},
    {"key": "consideration", "label": "Consideração",       "kpi": "ctr",             "objective": "TRAFFIC"},
    {"key": "lead",          "label": "Captação de Lead",   "kpi": "cpl",             "objective": "LEAD_GENERATION"},
    {"key": "visit",         "label": "Visita Agendada",    "kpi": "visit_rate",      "objective": "LEAD_GENERATION"},
    {"key": "sale",          "label": "Venda Realizada",    "kpi": "conversion_rate", "objective": "CONVERSIONS"}
  ]'::jsonb,
  creative_taxonomy = '{
    "formats": ["foto_fachada", "video_tour", "carrossel_ambientes", "stories_oferta", "reels_depoimento"],
    "angles": ["valor_mensalidade", "localizacao_premium", "diferencial_construtora", "urgencia_unidades", "financiamento_facilitado"],
    "cta_types": ["WHATSAPP_MESSAGE", "LEAD_FORM", "CALL_NOW", "WEBSITE"]
  }'::jsonb,
  primary_kpis = '[
    {"key": "cpl",         "label": "Custo por Lead (CPL)",          "unit": "BRL",   "lower_is_better": true},
    {"key": "ctr",         "label": "Taxa de Cliques (CTR)",          "unit": "%",     "lower_is_better": false},
    {"key": "frequency",   "label": "Frequência",                     "unit": "x",     "lower_is_better": true},
    {"key": "cpm",         "label": "Custo por Mil Impressões (CPM)", "unit": "BRL",   "lower_is_better": true},
    {"key": "lead_volume", "label": "Volume de Leads",                "unit": "leads", "lower_is_better": false}
  ]'::jsonb,
  updated_at = now()
WHERE slug = 'imobiliaria';

-- Saúde Digital
UPDATE public.system_segments SET
  vocabulary = '{
    "product": "serviço de saúde",
    "products": "serviços de saúde",
    "product_types": ["consulta", "exame", "cirurgia", "plano de saúde", "odontologia"],
    "lead_term": "paciente",
    "conversion_term": "consulta",
    "currency": "BRL",
    "audience_terms": ["paciente", "responsável", "segurado"],
    "pain_points": ["tempo de espera", "custo", "localização", "especialidade"],
    "cta_terms": ["Agendar consulta", "Saber mais", "Falar com especialista"]
  }'::jsonb,
  funnel_stages = '[
    {"key": "awareness",     "label": "Conscientização",        "kpi": "reach",            "objective": "BRAND_AWARENESS"},
    {"key": "consideration", "label": "Consideração",           "kpi": "ctr",              "objective": "TRAFFIC"},
    {"key": "lead",          "label": "Captação de Paciente",   "kpi": "cpl",              "objective": "LEAD_GENERATION"},
    {"key": "appointment",   "label": "Consulta Agendada",      "kpi": "appointment_rate", "objective": "LEAD_GENERATION"}
  ]'::jsonb,
  creative_taxonomy = '{
    "formats": ["foto_clinica", "video_depoimento", "carrossel_especialidades", "stories_promocao"],
    "angles": ["custo_acessivel", "equipe_especializada", "tecnologia_moderna", "atendimento_rapido"],
    "cta_types": ["WHATSAPP_MESSAGE", "LEAD_FORM", "CALL_NOW"]
  }'::jsonb,
  primary_kpis = '[
    {"key": "cpl",       "label": "Custo por Lead (CPL)",          "unit": "BRL", "lower_is_better": true},
    {"key": "ctr",       "label": "Taxa de Cliques (CTR)",          "unit": "%",   "lower_is_better": false},
    {"key": "frequency", "label": "Frequência",                     "unit": "x",   "lower_is_better": true},
    {"key": "cpm",       "label": "Custo por Mil Impressões (CPM)", "unit": "BRL", "lower_is_better": true}
  ]'::jsonb,
  updated_at = now()
WHERE slug = 'saude';

-- Venda de Carros
UPDATE public.system_segments SET
  vocabulary = '{
    "product": "veículo",
    "products": "veículos",
    "product_types": ["sedan", "SUV", "hatch", "pick-up", "elétrico", "seminovo"],
    "lead_term": "interessado",
    "conversion_term": "test drive",
    "currency": "BRL",
    "audience_terms": ["comprador", "motorista", "família"],
    "pain_points": ["preço", "financiamento", "consumo", "garantia"],
    "cta_terms": ["Ver oferta", "Agendar test drive", "Simular financiamento"]
  }'::jsonb,
  funnel_stages = '[
    {"key": "awareness",     "label": "Conscientização",   "kpi": "reach",            "objective": "BRAND_AWARENESS"},
    {"key": "consideration", "label": "Consideração",      "kpi": "ctr",              "objective": "TRAFFIC"},
    {"key": "lead",          "label": "Captação de Lead",  "kpi": "cpl",              "objective": "LEAD_GENERATION"},
    {"key": "test_drive",    "label": "Test Drive",        "kpi": "test_drive_rate",  "objective": "LEAD_GENERATION"},
    {"key": "sale",          "label": "Venda",             "kpi": "conversion_rate",  "objective": "CONVERSIONS"}
  ]'::jsonb,
  creative_taxonomy = '{
    "formats": ["foto_veiculo", "video_tour_interno", "carrossel_versoes", "stories_oferta", "reels_acelera"],
    "angles": ["preco_imbativel", "zero_entrada", "tecnologia_embarcada", "consumo_eficiente", "garantia_estendida"],
    "cta_types": ["WHATSAPP_MESSAGE", "LEAD_FORM", "CALL_NOW", "WEBSITE"]
  }'::jsonb,
  primary_kpis = '[
    {"key": "cpl",       "label": "Custo por Lead (CPL)",          "unit": "BRL", "lower_is_better": true},
    {"key": "ctr",       "label": "Taxa de Cliques (CTR)",          "unit": "%",   "lower_is_better": false},
    {"key": "frequency", "label": "Frequência",                     "unit": "x",   "lower_is_better": true},
    {"key": "cpm",       "label": "Custo por Mil Impressões (CPM)", "unit": "BRL", "lower_is_better": true}
  ]'::jsonb,
  updated_at = now()
WHERE slug = 'carros';

-- Geral (fallback universal)
UPDATE public.system_segments SET
  vocabulary = '{
    "product": "produto/serviço",
    "products": "produtos/serviços",
    "product_types": ["produto", "serviço"],
    "lead_term": "prospect",
    "conversion_term": "conversão",
    "currency": "BRL",
    "audience_terms": ["cliente potencial", "consumidor"],
    "pain_points": ["preço", "qualidade", "prazo", "atendimento"],
    "cta_terms": ["Saiba mais", "Entre em contato", "Fale conosco"]
  }'::jsonb,
  funnel_stages = '[
    {"key": "awareness",     "label": "Conscientização", "kpi": "reach",           "objective": "BRAND_AWARENESS"},
    {"key": "consideration", "label": "Consideração",    "kpi": "ctr",             "objective": "TRAFFIC"},
    {"key": "lead",          "label": "Captação de Lead","kpi": "cpl",             "objective": "LEAD_GENERATION"},
    {"key": "conversion",    "label": "Conversão",       "kpi": "conversion_rate", "objective": "CONVERSIONS"}
  ]'::jsonb,
  creative_taxonomy = '{
    "formats": ["foto_produto", "video_demonstracao", "carrossel_beneficios", "stories_oferta"],
    "angles": ["beneficio_principal", "diferencial", "prova_social", "oferta_especial"],
    "cta_types": ["WHATSAPP_MESSAGE", "LEAD_FORM", "CALL_NOW", "WEBSITE"]
  }'::jsonb,
  primary_kpis = '[
    {"key": "cpl",       "label": "Custo por Lead (CPL)",          "unit": "BRL", "lower_is_better": true},
    {"key": "ctr",       "label": "Taxa de Cliques (CTR)",          "unit": "%",   "lower_is_better": false},
    {"key": "frequency", "label": "Frequência",                     "unit": "x",   "lower_is_better": true},
    {"key": "cpm",       "label": "Custo por Mil Impressões (CPM)", "unit": "BRL", "lower_is_better": true}
  ]'::jsonb,
  updated_at = now()
WHERE slug = 'geral';

-- ────────────────────────────────────────────────────────────
-- 8. Seeds — Benchmarks por segmento
-- ────────────────────────────────────────────────────────────

-- Macro para inserir benchmark ignorando conflito
-- Imobiliário
DO $$ DECLARE seg_id UUID; BEGIN
  SELECT id INTO seg_id FROM public.system_segments WHERE slug = 'imobiliaria';
  INSERT INTO public.system_benchmarks (segment_id, metric_key, metric_label, value, unit, description)
  VALUES
    (seg_id, 'cpl_ideal',        'CPL Ideal (R$)',              35.00, 'BRL',   'Custo por lead aceitável para imóveis'),
    (seg_id, 'cpl_critical',     'CPL Crítico (R$)',            80.00, 'BRL',   'CPL acima desse valor exige ação imediata'),
    (seg_id, 'ctr_min',          'CTR Mínimo (%)',               0.80, '%',     'CTR abaixo disso indica criativo fraco'),
    (seg_id, 'ctr_scale',        'CTR para Escalar (%)',         2.00, '%',     'CTR que justifica aumento de orçamento'),
    (seg_id, 'frequency_max',    'Frequência Máxima (x)',        3.00, 'x',     'Acima disso indica fadiga de anúncio'),
    (seg_id, 'spend_no_lead',    'Gasto s/ Lead (R$)',          50.00, 'BRL',   'Gasto acumulado sem leads que dispara alerta'),
    (seg_id, 'min_leads_scale',  'Leads p/ Escalar',             5.00, 'leads', 'Mínimo de leads para recomendar escala'),
    (seg_id, 'min_days_running', 'Dias Mínimos para Avaliar',    3.00, 'days',  'Mínimo de dias de dados para ativar regras')
  ON CONFLICT (segment_id, metric_key) DO NOTHING;
END $$;

-- Saúde
DO $$ DECLARE seg_id UUID; BEGIN
  SELECT id INTO seg_id FROM public.system_segments WHERE slug = 'saude';
  INSERT INTO public.system_benchmarks (segment_id, metric_key, metric_label, value, unit, description)
  VALUES
    (seg_id, 'cpl_ideal',        'CPL Ideal (R$)',              25.00, 'BRL',   'Custo por lead aceitável para saúde'),
    (seg_id, 'cpl_critical',     'CPL Crítico (R$)',            60.00, 'BRL',   'CPL acima desse valor exige ação imediata'),
    (seg_id, 'ctr_min',          'CTR Mínimo (%)',               1.00, '%',     'CTR abaixo disso indica criativo fraco'),
    (seg_id, 'ctr_scale',        'CTR para Escalar (%)',         2.50, '%',     'CTR que justifica aumento de orçamento'),
    (seg_id, 'frequency_max',    'Frequência Máxima (x)',        3.50, 'x',     'Acima disso indica fadiga de anúncio'),
    (seg_id, 'spend_no_lead',    'Gasto s/ Lead (R$)',          40.00, 'BRL',   'Gasto acumulado sem leads que dispara alerta'),
    (seg_id, 'min_leads_scale',  'Leads p/ Escalar',             8.00, 'leads', 'Mínimo de leads para recomendar escala'),
    (seg_id, 'min_days_running', 'Dias Mínimos para Avaliar',    3.00, 'days',  'Mínimo de dias de dados para ativar regras')
  ON CONFLICT (segment_id, metric_key) DO NOTHING;
END $$;

-- Carros
DO $$ DECLARE seg_id UUID; BEGIN
  SELECT id INTO seg_id FROM public.system_segments WHERE slug = 'carros';
  INSERT INTO public.system_benchmarks (segment_id, metric_key, metric_label, value, unit, description)
  VALUES
    (seg_id, 'cpl_ideal',        'CPL Ideal (R$)',              45.00, 'BRL',   'Custo por lead aceitável para venda de carros'),
    (seg_id, 'cpl_critical',     'CPL Crítico (R$)',           100.00, 'BRL',   'CPL acima desse valor exige ação imediata'),
    (seg_id, 'ctr_min',          'CTR Mínimo (%)',               0.70, '%',     'CTR abaixo disso indica criativo fraco'),
    (seg_id, 'ctr_scale',        'CTR para Escalar (%)',         1.80, '%',     'CTR que justifica aumento de orçamento'),
    (seg_id, 'frequency_max',    'Frequência Máxima (x)',        3.00, 'x',     'Acima disso indica fadiga de anúncio'),
    (seg_id, 'spend_no_lead',    'Gasto s/ Lead (R$)',          70.00, 'BRL',   'Gasto acumulado sem leads que dispara alerta'),
    (seg_id, 'min_leads_scale',  'Leads p/ Escalar',             4.00, 'leads', 'Mínimo de leads para recomendar escala'),
    (seg_id, 'min_days_running', 'Dias Mínimos para Avaliar',    3.00, 'days',  'Mínimo de dias de dados para ativar regras')
  ON CONFLICT (segment_id, metric_key) DO NOTHING;
END $$;

-- Geral
DO $$ DECLARE seg_id UUID; BEGIN
  SELECT id INTO seg_id FROM public.system_segments WHERE slug = 'geral';
  INSERT INTO public.system_benchmarks (segment_id, metric_key, metric_label, value, unit, description)
  VALUES
    (seg_id, 'cpl_ideal',        'CPL Ideal (R$)',              30.00, 'BRL',   'Custo por lead padrão'),
    (seg_id, 'cpl_critical',     'CPL Crítico (R$)',            80.00, 'BRL',   'CPL acima desse valor exige ação imediata'),
    (seg_id, 'ctr_min',          'CTR Mínimo (%)',               1.00, '%',     'CTR abaixo disso indica criativo fraco'),
    (seg_id, 'ctr_scale',        'CTR para Escalar (%)',         2.00, '%',     'CTR que justifica aumento de orçamento'),
    (seg_id, 'frequency_max',    'Frequência Máxima (x)',        3.00, 'x',     'Acima disso indica fadiga de anúncio'),
    (seg_id, 'spend_no_lead',    'Gasto s/ Lead (R$)',          50.00, 'BRL',   'Gasto acumulado sem leads que dispara alerta'),
    (seg_id, 'min_leads_scale',  'Leads p/ Escalar',             5.00, 'leads', 'Mínimo de leads para recomendar escala'),
    (seg_id, 'min_days_running', 'Dias Mínimos para Avaliar',    3.00, 'days',  'Mínimo de dias de dados para ativar regras')
  ON CONFLICT (segment_id, metric_key) DO NOTHING;
END $$;

-- ────────────────────────────────────────────────────────────
-- 9. Seeds — Prompt Templates
-- ────────────────────────────────────────────────────────────

-- ── GLOBAL (fallback para todos os segmentos) ──

INSERT INTO public.system_prompt_templates
  (segment_id, template_key, version, title, content, variables)
VALUES (
  NULL, 'briefing_morning', 1, 'Briefing Matinal — Global',
  'Você é um especialista sênior em tráfego pago digital. Analise os dados abaixo e gere um briefing matinal estratégico e acionável.

Este é o briefing MATINAL. Foque no resumo do período anterior, alertas urgentes e plano de ação para o dia que está começando.

## Dados das Campanhas (últimos {{period_days}} dias)

{{campaigns_json}}

## Totais do Período
- Gasto total: R${{total_spend}}
- Cliques: {{total_clicks}}
- Impressões: {{total_impressions}}
- Leads: {{total_leads}}
- Campanhas ativas: {{active_campaigns}}/{{total_campaigns}}

## Variação vs Período Anterior
- Gasto: {{delta_spend}}%
- Cliques: {{delta_clicks}}%
- Impressões: {{delta_impressions}}%
- Leads: {{delta_leads}}%

## Alertas Automáticos
{{rule_insights}}

## Instruções
Analise com foco em:
1. Canibalização entre campanhas (públicos sobrepostos)
2. Realocação de budget entre campanhas
3. Fadiga criativa (frequência alta)
4. Otimização de CPL (custo por lead)
5. Tendências preocupantes ou oportunidades

Responda APENAS com JSON válido:
{
  "urgentAlerts": ["string"],
  "performanceSummary": "string",
  "campaignAnalysis": [{"campaignName": "string", "status": "healthy|warning|critical", "recommendation": "string", "priority": "high|medium|low"}],
  "budgetRecommendations": ["string"],
  "actionItems": ["string"],
  "tomorrowPlan": "string"
}',
  '["period_days","campaigns_json","total_spend","total_clicks","total_impressions","total_leads","active_campaigns","total_campaigns","delta_spend","delta_clicks","delta_impressions","delta_leads","rule_insights"]'::jsonb
)
ON CONFLICT DO NOTHING;

INSERT INTO public.system_prompt_templates
  (segment_id, template_key, version, title, content, variables)
VALUES (
  NULL, 'briefing_closing', 1, 'Briefing de Fechamento — Global',
  'Você é um especialista sênior em tráfego pago digital. Analise os dados abaixo e gere um briefing de fechamento de dia.

Este é o briefing de FECHAMENTO DO DIA. Foque na performance de hoje, comparação com metas e recomendações para amanhã.

## Dados das Campanhas (último dia)

{{campaigns_json}}

## Totais do Dia
- Gasto total: R${{total_spend}}
- Cliques: {{total_clicks}}
- Impressões: {{total_impressions}}
- Leads: {{total_leads}}
- Campanhas ativas: {{active_campaigns}}/{{total_campaigns}}

## Variação vs Ontem
- Gasto: {{delta_spend}}%
- Cliques: {{delta_clicks}}%
- Impressões: {{delta_impressions}}%
- Leads: {{delta_leads}}%

## Alertas Automáticos
{{rule_insights}}

Responda APENAS com JSON válido:
{
  "urgentAlerts": ["string"],
  "performanceSummary": "string",
  "campaignAnalysis": [{"campaignName": "string", "status": "healthy|warning|critical", "recommendation": "string", "priority": "high|medium|low"}],
  "budgetRecommendations": ["string"],
  "actionItems": ["string"],
  "tomorrowPlan": "string"
}',
  '["period_days","campaigns_json","total_spend","total_clicks","total_impressions","total_leads","active_campaigns","total_campaigns","delta_spend","delta_clicks","delta_impressions","delta_leads","rule_insights"]'::jsonb
)
ON CONFLICT DO NOTHING;

INSERT INTO public.system_prompt_templates
  (segment_id, template_key, version, title, content, variables)
VALUES (
  NULL, 'briefing_manual', 1, 'Briefing Manual — Global',
  'Você é um especialista sênior em tráfego pago digital. Este é um briefing MANUAL solicitado pelo gestor. Faça uma análise completa e estratégica.

## Dados das Campanhas (últimos {{period_days}} dias)

{{campaigns_json}}

## Totais do Período
- Gasto total: R${{total_spend}}
- Cliques: {{total_clicks}}
- Impressões: {{total_impressions}}
- Leads: {{total_leads}}
- Campanhas ativas: {{active_campaigns}}/{{total_campaigns}}

## Variação vs Período Anterior
- Gasto: {{delta_spend}}%
- Cliques: {{delta_clicks}}%
- Impressões: {{delta_impressions}}%
- Leads: {{delta_leads}}%

## Alertas Automáticos
{{rule_insights}}

Responda APENAS com JSON válido:
{
  "urgentAlerts": ["string"],
  "performanceSummary": "string",
  "campaignAnalysis": [{"campaignName": "string", "status": "healthy|warning|critical", "recommendation": "string", "priority": "high|medium|low"}],
  "budgetRecommendations": ["string"],
  "actionItems": ["string"],
  "tomorrowPlan": "string"
}',
  '["period_days","campaigns_json","total_spend","total_clicks","total_impressions","total_leads","active_campaigns","total_campaigns","delta_spend","delta_clicks","delta_impressions","delta_leads","rule_insights"]'::jsonb
)
ON CONFLICT DO NOTHING;

INSERT INTO public.system_prompt_templates
  (segment_id, template_key, version, title, content, variables)
VALUES (
  NULL, 'agent_enrich', 1, 'Enriquecimento de Insight — Global',
  'Você é um especialista sênior em tráfego pago digital. Enriqueça esta recomendação com contexto prático em português BR. Máximo 180 caracteres.

Campanha: {{campaign_name}}
Insight: {{insight_title}}
Dados: {{insight_description}}
Confiança: {{confidence}}%

Responda APENAS JSON: {"description": "texto enriquecido"}',
  '["campaign_name","insight_title","insight_description","confidence"]'::jsonb
)
ON CONFLICT DO NOTHING;

-- ── IMOBILIÁRIO (template específico — mais completo e com terminologia do setor) ──

INSERT INTO public.system_prompt_templates
  (segment_id, template_key, version, title, content, variables)
SELECT
  id,
  'briefing_morning', 1, 'Briefing Matinal — Imobiliário',
  'Você é um especialista sênior em tráfego pago para o mercado imobiliário brasileiro. Sua especialidade é gerar leads qualificados de compradores de imóveis via Meta Ads (Facebook/Instagram).

Este é o briefing MATINAL. Foque no resumo do período anterior, alertas urgentes e plano de ação para o dia que está começando. Use terminologia do mercado imobiliário (CPL, lead qualificado, visita, financiamento, corretor).

## Dados das Campanhas (últimos {{period_days}} dias)

{{campaigns_json}}

## Totais do Período
- Gasto total: R${{total_spend}}
- Cliques: {{total_clicks}}
- Impressões: {{total_impressions}}
- Leads WhatsApp: {{total_leads}}
- Campanhas ativas: {{active_campaigns}}/{{total_campaigns}}

## Variação vs Período Anterior
- Gasto: {{delta_spend}}%
- Cliques: {{delta_clicks}}%
- Impressões: {{delta_impressions}}%
- Leads: {{delta_leads}}%

## Alertas do Motor de Regras
{{rule_insights}}

## Instruções
Analise com foco em:
1. Canibalização entre campanhas (públicos sobrepostos — comum em campanhas por bairro/região)
2. Realocação de budget (tirar de quem tem CPL alto, escalar quem tem CPL abaixo de R$35)
3. Fadiga criativa (frequência acima de 3x = criativo saturado, trocar foto/vídeo do imóvel)
4. Qualidade do lead vs volume (lead que chega via WhatsApp tem intenção maior que form)
5. Horário de pico local (imóveis: interesse maior no fim de semana e noite de semana)

Responda APENAS com JSON válido:
{
  "urgentAlerts": ["string — alertas que precisam de ação imediata"],
  "performanceSummary": "string — resumo geral da performance em 2-3 frases",
  "campaignAnalysis": [{"campaignName": "string", "status": "healthy|warning|critical", "recommendation": "string — recomendação específica e acionável", "priority": "high|medium|low"}],
  "budgetRecommendations": ["string — sugestões de realocação de budget"],
  "actionItems": ["string — ações concretas para executar hoje"],
  "tomorrowPlan": "string — o que focar amanhã"
}',
  '["period_days","campaigns_json","total_spend","total_clicks","total_impressions","total_leads","active_campaigns","total_campaigns","delta_spend","delta_clicks","delta_impressions","delta_leads","rule_insights"]'::jsonb
FROM public.system_segments WHERE slug = 'imobiliaria'
ON CONFLICT DO NOTHING;

INSERT INTO public.system_prompt_templates
  (segment_id, template_key, version, title, content, variables)
SELECT
  id,
  'briefing_closing', 1, 'Briefing de Fechamento — Imobiliário',
  'Você é um especialista sênior em tráfego pago para o mercado imobiliário brasileiro.

Este é o briefing de FECHAMENTO DO DIA. Foque na performance de hoje, comparação com metas do segmento imobiliário (CPL ideal: R$35, CTR saudável: >1%, frequência máxima: 3x) e recomendações para amanhã.

## Dados das Campanhas (hoje)

{{campaigns_json}}

## Totais do Dia
- Gasto total: R${{total_spend}}
- Cliques: {{total_clicks}}
- Impressões: {{total_impressions}}
- Leads WhatsApp: {{total_leads}}
- Campanhas ativas: {{active_campaigns}}/{{total_campaigns}}

## Variação vs Ontem
- Gasto: {{delta_spend}}%
- Cliques: {{delta_clicks}}%
- Impressões: {{delta_impressions}}%
- Leads: {{delta_leads}}%

## Alertas Automáticos
{{rule_insights}}

Responda APENAS com JSON válido:
{
  "urgentAlerts": ["string"],
  "performanceSummary": "string",
  "campaignAnalysis": [{"campaignName": "string", "status": "healthy|warning|critical", "recommendation": "string", "priority": "high|medium|low"}],
  "budgetRecommendations": ["string"],
  "actionItems": ["string"],
  "tomorrowPlan": "string"
}',
  '["period_days","campaigns_json","total_spend","total_clicks","total_impressions","total_leads","active_campaigns","total_campaigns","delta_spend","delta_clicks","delta_impressions","delta_leads","rule_insights"]'::jsonb
FROM public.system_segments WHERE slug = 'imobiliaria'
ON CONFLICT DO NOTHING;

INSERT INTO public.system_prompt_templates
  (segment_id, template_key, version, title, content, variables)
SELECT
  id,
  'agent_enrich', 1, 'Enriquecimento de Insight — Imobiliário',
  'Você é um especialista sênior em tráfego pago para o mercado imobiliário brasileiro. Enriqueça esta recomendação com contexto prático e específico do setor imobiliário em português BR. Máximo 180 caracteres.

Campanha: {{campaign_name}}
Insight: {{insight_title}}
Dados: {{insight_description}}
Confiança: {{confidence}}%

Referência do segmento: CPL ideal para imóveis R$20-50, CTR saudável >1%, frequência máxima 3x.

Responda APENAS JSON: {"description": "texto enriquecido"}',
  '["campaign_name","insight_title","insight_description","confidence"]'::jsonb
FROM public.system_segments WHERE slug = 'imobiliaria'
ON CONFLICT DO NOTHING;

COMMIT;

-- ── Verificação pós-execução ──
SELECT 'FASE 0 — Verificação' AS fase;
SELECT 'system_segments enriquecidos' AS tabela, count(*) AS rows
  FROM public.system_segments WHERE vocabulary != '{}';
SELECT 'system_benchmarks' AS tabela, count(*) AS rows
  FROM public.system_benchmarks;
SELECT 'system_prompt_templates' AS tabela, count(*) AS rows
  FROM public.system_prompt_templates;
SELECT 'clientes com segment_id' AS tabela, count(*) AS rows
  FROM public.clientes WHERE segment_id IS NOT NULL;

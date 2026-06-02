-- ============================================================
-- FASE 9 — Audit Report Estruturado
-- 2026-06-01
-- ============================================================

-- Tabela principal
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."AuditReport" (
  id            UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID      NOT NULL,
  client_id     UUID,
  period_start  DATE      NOT NULL,
  period_end    DATE      NOT NULL,
  overall_score INTEGER,
  scorecard     JSONB     NOT NULL DEFAULT '{}',
  problems      JSONB     NOT NULL DEFAULT '[]',
  opportunities JSONB     NOT NULL DEFAULT '[]',
  wasted_spend  JSONB     NOT NULL DEFAULT '{}',
  action_plan   JSONB     NOT NULL DEFAULT '[]',
  narrative     TEXT,
  created_at    TIMESTAMP DEFAULT NOW(),
  CONSTRAINT uq_audit_report UNIQUE (tenant_id, client_id, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_audit_report_tenant
  ON campanhasmarketingdigital."AuditReport" (tenant_id, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_audit_report_client
  ON campanhasmarketingdigital."AuditReport" (client_id, period_start DESC)
  WHERE client_id IS NOT NULL;

-- Prompt templates para geração de narrativa
-- Usa INSERT ... WHERE NOT EXISTS (sem unique constraint em template_key)
INSERT INTO public.system_prompt_templates
  (id, template_key, title, content, variables, version, is_active, segment_id, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'audit_report_monthly',
  'Auditoria Mensal — Narrativa Executiva',
  'Você é um consultor sênior de marketing digital especializado em {{segment}}.

Analise o relatório de auditoria mensal a seguir e gere um diagnóstico executivo CONCISO (máx. 250 palavras) em português brasileiro.

Período: {{period}}
Score Geral: {{overall_score}}/100

Scorecard:
{{scorecard}}

Top Problemas:
{{problems}}

Top Oportunidades:
{{opportunities}}

Desperdício estimado: {{wasted_total}}

Plano de ação:
{{action_plan}}

Formate assim:
1. Parágrafo de contexto (2 frases)
2. Principais achados (3 bullets)
3. Recomendação prioritária (1 frase direta)

Seja direto, use números reais, evite jargão.',
  '["segment","period","overall_score","scorecard","problems","opportunities","wasted_total","action_plan"]'::jsonb,
  1,
  true,
  NULL,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_prompt_templates WHERE template_key = 'audit_report_monthly'
);

INSERT INTO public.system_prompt_templates
  (id, template_key, title, content, variables, version, is_active, segment_id, created_at, updated_at)
SELECT
  gen_random_uuid(),
  'audit_report_weekly',
  'Auditoria Semanal — Briefing Rápido',
  'Você é um consultor sênior de marketing digital especializado em {{segment}}.

Analise o relatório semanal e gere um briefing rápido (máx. 150 palavras) em português brasileiro.

Período: {{period}}
Score Geral: {{overall_score}}/100

Principais problemas desta semana:
{{problems}}

Oportunidades imediatas:
{{opportunities}}

Ação desta semana: {{action_plan}}

Formate: 2 bullets de problema + 1 bullet de oportunidade + 1 linha de ação urgente.',
  '["segment","period","overall_score","problems","opportunities","action_plan"]'::jsonb,
  1,
  true,
  NULL,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_prompt_templates WHERE template_key = 'audit_report_weekly'
);

-- FASE 3: Wasted Spend quantification
-- Idempotent: uses ON CONFLICT DO NOTHING

-- Prompt template for AI narrative
INSERT INTO public.system_prompt_templates
  (segment_id, template_key, version, title, content, variables, is_active)
VALUES (
  NULL,
  'wasted_spend_explanation',
  1,
  'Análise de Desperdício de Verba',
  E'Você é um especialista em marketing digital imobiliário. Analise os dados de desperdício de verba e gere uma narrativa executiva clara, direta e em português brasileiro. Use linguagem de negócio, não técnica. Destaque os valores em reais desperdiçados e o impacto nos resultados.\n\nAnálise de Desperdício de Verba — {{period_days}} dias\n\nTotal identificado: R$ {{total_wasted}}\n\nPor categoria:\n- Sem leads: R$ {{zero_leads_amount}} ({{zero_leads_count}} campanha(s))\n- CPL crítico: R$ {{high_cpl_amount}} ({{high_cpl_count}} campanha(s))\n- Fadiga de audiência: R$ {{fatigued_amount}} ({{fatigued_count}} campanha(s))\n- Fase de aprendizado: R$ {{learning_amount}} ({{learning_count}} campanha(s))\n\nPrincipais campanhas com desperdício:\n{{top_campaigns}}\n\nPlano de recuperação sugerido:\n{{recovery_plan}}\n\nGere uma análise executiva em 3-4 parágrafos: (1) resumo do impacto financeiro, (2) principais causas identificadas, (3) ações prioritárias recomendadas, (4) projeção de economia se ações forem tomadas.',
  '["period_days","total_wasted","zero_leads_count","zero_leads_amount","high_cpl_count","high_cpl_amount","fatigued_count","fatigued_amount","learning_count","learning_amount","top_campaigns","recovery_plan"]'::jsonb,
  true
)
ON CONFLICT DO NOTHING;

-- Sidebar menu item for /admin/campanhas/desperdicio
INSERT INTO public.sidebar_menu_items (parent_id, name, icon_name, url, order_index, is_active, system_id)
VALUES (
  110,
  'Desperdício',
  'alert-triangle',
  '/admin/campanhas/desperdicio',
  112,
  true,
  'admin'
)
ON CONFLICT DO NOTHING;

-- Record migration
INSERT INTO public.schema_migrations (filename, applied_at)
VALUES ('migration-2026-05-fase3-wasted-spend.sql', NOW())
ON CONFLICT (filename) DO NOTHING;

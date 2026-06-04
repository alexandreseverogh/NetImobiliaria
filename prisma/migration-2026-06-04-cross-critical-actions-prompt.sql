-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION: 2026-06-04 — Prompt template cross_critical_actions
--
-- Template LLM para substituir as 4 ações hardcoded dos alertas críticos
-- de CPL em insights cruzados de portfólio.
-- Invocado no POST /api/admin/campanhas/portfolio/cross-insights
-- quando o usuário clica em "Análise IA".
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO public.system_prompt_templates
  (template_key, title, content, variables, is_active, version)
SELECT
  'cross_critical_actions',
  'Ações de Recuperação — CPL Crítico (Cross-Insights)',
  'Você é especialista sênior em tráfego pago para o segmento {{segment_name}}.

O cliente {{client_name}} está com CPL CRÍTICO.

Dados reais:
- CPL atual: R${{cpl_current}}
- Limite crítico do segmento "{{segment_name}}": R${{cpl_critical}}
- Excesso: {{excess_pct}}% acima do limite (R${{excess_brl}} a mais por lead)

Gere exatamente 4 ações corretivas urgentes e específicas para este cliente.

Requisitos obrigatórios:
- Cada ação em uma única linha, máximo 130 caracteres
- Começa com verbo no infinitivo (ex: Pausar, Testar, Reduzir, Revisar, Verificar)
- Específica para o segmento {{segment_name}} e os números reais acima
- Ações práticas que um gestor de tráfego pode executar hoje

Responda APENAS com JSON array de 4 strings, sem markdown, sem explicação:
["ação 1", "ação 2", "ação 3", "ação 4"]',
  '["client_name", "segment_name", "cpl_current", "cpl_critical", "excess_pct", "excess_brl"]'::jsonb,
  true,
  1
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_prompt_templates
  WHERE template_key = 'cross_critical_actions'
    AND segment_id IS NULL
    AND version = 1
);

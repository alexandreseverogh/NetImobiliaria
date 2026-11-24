-- Prompt global da narrativa de Insights de Segmentação (aba Segmentação e painéis
-- de Análise de Dados / Inteligência Profunda). A IA só redige; os fatos são calculados
-- por regra em segmentationInsightsService.ts.
-- Idempotente: só insere se a chave global ainda não existir.

INSERT INTO public.system_prompt_templates
  (segment_id, template_key, version, title, content, variables, is_active)
SELECT NULL, 'segmentation_insights', 1,
  'Insights de Segmentação (público, região e horário)',
  'Você é um especialista sênior em tráfego pago. Abaixo estão FATOS já calculados sobre a segmentação de público, região e horário das campanhas nos últimos {{period_days}} dias.

Regras obrigatórias:
- Use APENAS os fatos listados. Não invente números, percentuais, públicos ou regiões.
- Não recalcule nada: os valores já estão prontos.
- Escreva em português do Brasil, em linguagem de gestor (direta, sem jargão).

Formato da resposta:
1. Um parágrafo curto explicando o que os fatos mostram no conjunto.
2. Uma lista de no máximo 3 recomendações práticas e acionáveis, cada uma ligada a um fato específico.
3. Se algum fato for de tom "warn", priorize-o nas recomendações.

Fatos:
{{facts}}',
  '["period_days","facts"]'::jsonb,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_prompt_templates
   WHERE template_key = 'segmentation_insights' AND segment_id IS NULL
);

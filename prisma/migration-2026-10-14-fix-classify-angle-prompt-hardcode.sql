-- Correção P1 (docs/PLANO_INTEGRACAO_JEV.md §5.2) — o prompt global de
-- 'classify_campaign_angle' tinha 2 hardcodes reais: (1) "Você é especialista em marketing
-- imobiliário" — viés de segmento num template GLOBAL, aplicado a toda campanha de qualquer
-- segmento; (2) lista fixa dos 8 ângulos legados de src/lib/marketing/angles.ts, em vez da
-- taxonomia real do segmento (segment_angle_terms). O código (angleClassifierService.ts) agora
-- resolve as opções reais por segmento e injeta como nova variável {{angle_options}} — este
-- UPDATE só alinha o TEXTO do prompt a essa variável nova, removendo os 2 hardcodes.
--
-- Fallback explícito: se {{angle_options}} vier vazio (não deveria acontecer — o código sempre
-- resolve pelo menos a taxonomia legada de 8 valores quando o segmento não tem ângulos próprios
-- cadastrados), a instrução abaixo orienta o LLM a devolver "other"/confiança baixa em vez de
-- inventar uma categoria.

UPDATE public.system_prompt_templates
SET
  content = $prompt$Classifique o ângulo persuasivo de cada campanha abaixo, baseado exclusivamente no nome da campanha.

Ângulos válidos para este segmento (use o slug exato, à esquerda de cada linha):
{{angle_options}}

Campanhas para classificar:
{{campaign_list}}

REGRAS OBRIGATÓRIAS:
1. Responda APENAS com um JSON array válido — sem explicações, sem markdown, sem texto adicional
2. Inclua TODOS os IDs fornecidos na resposta
3. Use SOMENTE um dos slugs listados em "Ângulos válidos" — nunca invente um slug novo nem use um ângulo de outro domínio de negócio
4. Se o nome da campanha não der pistas suficientes para nenhum dos ângulos válidos, use o slug mais genérico disponível na lista e confidence "low"
5. confidence "high" = nome deixa claro o ângulo | "medium" = razoável inferir | "low" = nome muito genérico
6. Formato exato (não altere os campos): [{"id":"uuid-exato","angle":"slug-exato-da-lista","confidence":"high|medium|low"}]$prompt$,
  variables = '["campaign_list", "angle_options"]'::jsonb,
  updated_at = now()
WHERE template_key = 'classify_campaign_angle'
  AND segment_id IS NULL
  AND tenant_id IS NULL
  AND client_id IS NULL;

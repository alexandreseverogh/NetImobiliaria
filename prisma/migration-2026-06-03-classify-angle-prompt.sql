-- FASE 14d: template LLM para classificação automática de ângulo por nome de campanha

INSERT INTO public.system_prompt_templates (
  "templateKey", "promptText", "variables", "description", "isActive"
)
SELECT
  'classify_campaign_angle',
  $prompt$Você é especialista em marketing imobiliário. Classifique o ângulo persuasivo de cada campanha abaixo baseado exclusivamente no nome da campanha.

Ângulos disponíveis (use o valor exato em inglês):
- investment: valorização, ROI, renda passiva, patrimônio, retorno financeiro
- lifestyle: qualidade de vida, aspiração, lazer, bem-estar, conforto, vista
- family: família, segurança, lar, espaço para crescer, proteção, filhos
- price: preço, condições, parcelas, custo-benefício, oferta, desconto, valor
- urgency: últimas unidades, prazo limitado, escassez, oportunidade única, agora
- social: depoimentos, reputação, prova social, comunidade, avaliações, reviews
- luxury: alto padrão, exclusividade, sofisticação, prestígio, premium, nobre
- other: não se encaixa claramente em nenhum dos anteriores

Campanhas para classificar:
{{campaign_list}}

REGRAS OBRIGATÓRIAS:
1. Responda APENAS com um JSON array válido — sem explicações, sem markdown, sem texto adicional
2. Inclua TODOS os IDs fornecidos na resposta
3. confidence "high" = nome deixa claro o ângulo | "medium" = razoável inferir | "low" = nome muito genérico
4. Formato exato (não altere os campos): [{"id":"uuid-exato","angle":"valor-em-ingles","confidence":"high|medium|low"}]$prompt$,
  ARRAY['campaign_list'],
  'Classifica ângulo persuasivo de campanhas imobiliárias pelo nome — job de auto-classificação em lote (FASE 14d).',
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_prompt_templates WHERE "templateKey" = 'classify_campaign_angle'
);

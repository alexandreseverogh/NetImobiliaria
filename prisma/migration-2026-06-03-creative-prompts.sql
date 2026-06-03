-- ============================================================
-- FASE 6 — Prompts creative_vision_analysis + creative_concept_generation
-- 2026-06-03
-- Migra os 2 prompts hardcoded de creativeAnalysisService.ts
-- para system_prompt_templates (princípio ZERO HARDCODE).
-- ============================================================

-- 1. Análise de visão (VISION_PROMPT) — sem variáveis, prompt estático
INSERT INTO public.system_prompt_templates
  (id, segment_id, template_key, version, title, content, variables, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  NULL,
  'creative_vision_analysis',
  1,
  'Creative — Análise de Imagem (Vision)',
  $PROMPT$Você é um especialista em análise de criativos para anúncios de performance digital.
Analise esta imagem e retorne APENAS um JSON válido, sem markdown, sem texto extra.

{
  "has_people": boolean,
  "has_property": boolean,
  "has_text_overlay": boolean,
  "is_ugc_style": boolean,
  "is_corporate_style": boolean,
  "hook_type": "urgency|curiosity|social_proof|benefit|story|problem|other",
  "emotional_tone": "aspirational|fear|joy|trust|excitement|neutral",
  "angle": "investment|lifestyle|family|price|urgency|social|luxury|other",
  "cta_style": "direct|soft|question|command|none",
  "scene_description": "descrição objetiva da cena em 1 frase",
  "key_visual_elements": ["elemento1", "elemento2"],
  "confidence": 0.85
}$PROMPT$,
  '[]'::jsonb,
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_prompt_templates WHERE template_key = 'creative_vision_analysis'
);

-- 2. Geração de conceitos criativos — com variáveis de contexto
INSERT INTO public.system_prompt_templates
  (id, segment_id, template_key, version, title, content, variables, is_active, created_at, updated_at)
SELECT
  gen_random_uuid(),
  NULL,
  'creative_concept_generation',
  1,
  'Creative — Geração de Conceitos Criativos',
  $PROMPT$Você é um especialista em criação de anúncios para o segmento {{segment}}.

Com base no padrão vencedor abaixo, gere 5 conceitos de novos criativos.

PADRÃO VENCEDOR:
- Estilo: {{style}}
- Hook: {{hook_type}}
- Ângulo: {{angle}}
- Tom emocional: {{emotional_tone}}
- CTR médio: {{avg_ctr}}%
- CPL médio: R$ {{avg_cpl}}
- Anúncios testados: {{ads_count}}

Retorne APENAS este JSON válido (sem markdown):
{
  "concepts": [
    {
      "format": "image|video_15s|video_30s|carousel",
      "scene": "descrição visual detalhada da cena",
      "hook_text": "texto de abertura (primeiros 3 segundos ou primeira linha)",
      "body": "texto do anúncio (2-3 frases diretas)",
      "headline": "headline impactante (máx 40 chars)",
      "cta": "texto do CTA",
      "why_it_works": "motivo breve baseado no padrão"
    }
  ]
}$PROMPT$,
  '["segment","style","hook_type","angle","emotional_tone","avg_ctr","avg_cpl","ads_count"]'::jsonb,
  true,
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_prompt_templates WHERE template_key = 'creative_concept_generation'
);

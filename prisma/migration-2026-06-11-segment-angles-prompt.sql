-- FASE 18.3 — Prompt: sugestão de ângulos + termos de Trends por segmento
-- Migration: 2026-06-11 (parte 18.3)
-- Template global em public.system_prompt_templates. ZERO HARDCODE.
-- Usado por segmentAngleSuggestionService para o LLM propor ângulos de um nicho.

INSERT INTO public.system_prompt_templates (
  template_key, title, content, variables, is_active, created_at, updated_at
)
VALUES (
  'segment_angles_suggestion',
  'Sugestão de Ângulos por Segmento',
  E'Você é um estrategista de marketing digital especialista em segmentação de mercado no Brasil.\n\nO segmento de negócio é:\n- Nome: {{segment_name}}\n- Descrição: {{segment_description}}\n\nGere de 4 a 6 ÂNGULOS DE COMUNICAÇÃO típicos que anúncios desse segmento usariam, e para cada ângulo, de 1 a 2 TERMOS DE BUSCA em português do Brasil que pessoas digitariam no Google ao ter a intenção daquele ângulo (úteis para medir demanda no Google Trends).\n\nRegras:\n1. slug: minúsculo, sem acentos, palavras separadas por _ (ex: preco_acessivel, localizacao_premium).\n2. label: rótulo curto e claro em PT-BR (ex: Preço Acessível).\n3. terms: termos REAIS de busca PT-BR, populares, específicos do nicho (ex: "plano de saúde barato"). Nunca genéricos demais.\n4. Responda APENAS com um array JSON válido, sem texto antes ou depois.\n\nFormato exato:\n[\n  {"slug":"exemplo_angulo","label":"Exemplo do Ângulo","terms":["termo de busca 1","termo de busca 2"]}\n]',
  '["segment_name","segment_description"]'::jsonb,
  true,
  NOW(),
  NOW()
)
ON CONFLICT (template_key, version) WHERE segment_id IS NULL
DO UPDATE SET
  content    = EXCLUDED.content,
  variables  = EXCLUDED.variables,
  updated_at = NOW();

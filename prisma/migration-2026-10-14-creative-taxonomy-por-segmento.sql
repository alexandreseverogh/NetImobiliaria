-- Correção P3 (docs/PLANO_INTEGRACAO_JEV.md §5.2/§5.3) — creativeAnalysisService.ts (Vision)
-- tinha 3 problemas de hardcode reais: (1) `angle` extraído pelo Vision era uma 3ª fonte
-- desalinhada de `segment_angle_terms`/`angles.ts`; (2) `hook_type` tinha enum fixo em TS
-- (VALID_HOOK_TYPES); (3) `cta_style` não tinha NENHUM enum, nem em código nem em tabela.
-- Mesmo padrão já comprovado em segment_angle_terms (FASE 18.2): catálogo por segmento,
-- curado pelo Master, com fallback transparente pra taxonomia legada enquanto o segmento não
-- tiver o próprio cadastro.
--
-- Backfill: TODOS os segmentos ativos recebem a MESMA taxonomia que hoje está hardcoded —
-- zero regressão de comportamento no momento desta migração. A partir daqui, cada segmento
-- pode ser customizado pelo Master sem tocar em código.

CREATE TABLE IF NOT EXISTS campanhasmarketingdigital.segment_hook_type_terms (
  id          BIGSERIAL PRIMARY KEY,
  segment_id  UUID         NOT NULL REFERENCES public.system_segments(id) ON DELETE CASCADE,
  hook_slug   VARCHAR(60)  NOT NULL,
  hook_label  VARCHAR(120) NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (segment_id, hook_slug)
);

CREATE TABLE IF NOT EXISTS campanhasmarketingdigital.segment_cta_style_terms (
  id          BIGSERIAL PRIMARY KEY,
  segment_id  UUID         NOT NULL REFERENCES public.system_segments(id) ON DELETE CASCADE,
  style_slug  VARCHAR(60)  NOT NULL,
  style_label VARCHAR(120) NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (segment_id, style_slug)
);

CREATE TABLE IF NOT EXISTS campanhasmarketingdigital.segment_creative_boolean_checks (
  id          BIGSERIAL PRIMARY KEY,
  segment_id  UUID         NOT NULL REFERENCES public.system_segments(id) ON DELETE CASCADE,
  check_key   VARCHAR(60)  NOT NULL,
  check_label VARCHAR(200) NOT NULL,
  ativo       BOOLEAN      NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (segment_id, check_key)
);

COMMENT ON TABLE campanhasmarketingdigital.segment_hook_type_terms IS
  'Correção P3 — taxonomia de hook_type por segmento, curada pelo Master. ZERO HARDCODE.';
COMMENT ON TABLE campanhasmarketingdigital.segment_cta_style_terms IS
  'Correção P3 — taxonomia de cta_style por segmento, curada pelo Master. ZERO HARDCODE.';
COMMENT ON TABLE campanhasmarketingdigital.segment_creative_boolean_checks IS
  'Correção P3 — quais checagens booleanas da Vision se aplicam a cada segmento (e com qual rótulo), curado pelo Master.';

-- Backfill hook_type — mesmos 7 valores já hardcoded em creativeAnalysisService.ts (VALID_HOOK_TYPES)
INSERT INTO campanhasmarketingdigital.segment_hook_type_terms (segment_id, hook_slug, hook_label)
SELECT s.id, h.slug, h.label
FROM public.system_segments s
CROSS JOIN (VALUES
  ('urgency',      'Urgência'),
  ('curiosity',    'Curiosidade'),
  ('social_proof', 'Prova Social'),
  ('benefit',      'Benefício'),
  ('story',        'História'),
  ('problem',      'Problema'),
  ('other',        'Outro')
) AS h(slug, label)
WHERE s.is_active = true
ON CONFLICT (segment_id, hook_slug) DO NOTHING;

-- Backfill cta_style — mesmos 5 valores já hardcoded no texto do prompt creative_vision_analysis
INSERT INTO campanhasmarketingdigital.segment_cta_style_terms (segment_id, style_slug, style_label)
SELECT s.id, c.slug, c.label
FROM public.system_segments s
CROSS JOIN (VALUES
  ('direct',   'Direto'),
  ('soft',     'Suave'),
  ('question', 'Pergunta'),
  ('command',  'Comando'),
  ('none',     'Nenhum')
) AS c(slug, label)
WHERE s.is_active = true
ON CONFLICT (segment_id, style_slug) DO NOTHING;

-- Backfill checagens booleanas — mesmos 5 campos já existentes em CreativeAnalysis, todas
-- ativas por padrão (preserva o comportamento atual; Master pode desativar por segmento
-- se algum flag não fizer sentido pra aquele nicho).
INSERT INTO campanhasmarketingdigital.segment_creative_boolean_checks (segment_id, check_key, check_label, ativo)
SELECT s.id, b.key, b.label, true
FROM public.system_segments s
CROSS JOIN (VALUES
  ('has_people',         'Tem pessoa(s) visível(is) na imagem'),
  ('has_property',       'Tem o item/ativo principal do anúncio visível na imagem'),
  ('has_text_overlay',   'Tem texto sobreposto na imagem'),
  ('is_ugc_style',       'Estilo UGC (parece conteúdo de usuário, não produção profissional)'),
  ('is_corporate_style', 'Estilo corporativo/institucional')
) AS b(key, label)
WHERE s.is_active = true
ON CONFLICT (segment_id, check_key) DO NOTHING;

-- Prompt creative_vision_analysis — remove os enums hardcoded do TEXTO, substitui por
-- variáveis dirigidas por segmento ({{angle_options}} reaproveita a MESMA fonte já usada
-- pelo classificador em lote de ângulo, segment_angle_terms — unifica as 2 fontes
-- desalinhadas de ângulo que existiam no sistema).
UPDATE public.system_prompt_templates
SET
  content = $prompt$Você é um especialista em análise de criativos para anúncios de performance digital.
Analise esta imagem e retorne APENAS um JSON válido, sem markdown, sem texto extra.

Contexto das checagens booleanas abaixo (o que cada uma significa neste segmento):
{{boolean_checks_context}}

Ângulos de comunicação válidos (use o slug exato):
{{angle_options}}

Tipos de hook válidos (use o slug exato):
{{hook_options}}

Estilos de CTA válidos (use o slug exato):
{{cta_options}}

{
  "has_people": boolean,
  "has_property": boolean,
  "has_text_overlay": boolean,
  "is_ugc_style": boolean,
  "is_corporate_style": boolean,
  "hook_type": "slug-exato-da-lista-de-hooks",
  "emotional_tone": "aspirational|fear|joy|trust|excitement|neutral",
  "angle": "slug-exato-da-lista-de-angulos",
  "cta_style": "slug-exato-da-lista-de-cta",
  "scene_description": "descrição objetiva da cena em 1 frase",
  "key_visual_elements": ["elemento1", "elemento2"],
  "confidence": 0.85
}$prompt$,
  variables = '["boolean_checks_context", "angle_options", "hook_options", "cta_options"]'::jsonb,
  updated_at = now()
WHERE template_key = 'creative_vision_analysis'
  AND segment_id IS NULL
  AND tenant_id IS NULL
  AND client_id IS NULL;

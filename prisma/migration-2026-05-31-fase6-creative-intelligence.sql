-- ============================================================
-- FASE 6 — Creative Intelligence Layer
-- 2026-05-31
-- ============================================================

-- 1. CreativeAsset — registro persistente de cada criativo carregado
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."CreativeAsset" (
  id              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID    NOT NULL,
  client_id       UUID,
  original_name   TEXT    NOT NULL,
  storage_path    TEXT    NOT NULL,   -- caminho local relativo (public/uploads/criativos/...)
  storage_url     TEXT    NOT NULL,   -- URL pública acessível
  file_size       INTEGER,
  mime_type       TEXT    DEFAULT 'image/jpeg',
  format          VARCHAR(10) DEFAULT 'image',   -- image | video
  width           INTEGER,
  height          INTEGER,
  hash            TEXT,               -- SHA-256 p/ deduplicação
  campaign_id     TEXT,               -- Campaign.id (TEXT)
  ad_id           TEXT,               -- Ad.id (TEXT)
  is_active       BOOLEAN DEFAULT TRUE,
  uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_creative_asset_tenant  ON campanhasmarketingdigital."CreativeAsset"(tenant_id);
CREATE INDEX IF NOT EXISTS idx_creative_asset_hash    ON campanhasmarketingdigital."CreativeAsset"(hash);
CREATE INDEX IF NOT EXISTS idx_creative_asset_campaign ON campanhasmarketingdigital."CreativeAsset"(campaign_id);

-- 2. CreativeAnalysis — resultado da análise Vision LLM
CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."CreativeAnalysis" (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id            UUID NOT NULL REFERENCES campanhasmarketingdigital."CreativeAsset"(id) ON DELETE CASCADE,
  tenant_id           UUID NOT NULL,

  -- Estrutura visual
  has_people          BOOLEAN DEFAULT FALSE,
  has_property        BOOLEAN DEFAULT FALSE,
  has_text_overlay    BOOLEAN DEFAULT FALSE,
  is_ugc_style        BOOLEAN DEFAULT FALSE,
  is_corporate_style  BOOLEAN DEFAULT FALSE,

  -- Narrativa (LLM Vision)
  hook_type           VARCHAR(50),   -- urgency|curiosity|social_proof|benefit|story|problem|other
  emotional_tone      VARCHAR(50),   -- aspirational|fear|joy|trust|excitement|neutral
  angle               VARCHAR(50),   -- investment|lifestyle|family|price|urgency|social|luxury|other
  cta_style           VARCHAR(20),   -- direct|soft|question|command|none

  -- Copy
  body_word_count     INTEGER DEFAULT 0,
  headline_word_count INTEGER DEFAULT 0,
  has_emoji           BOOLEAN DEFAULT FALSE,
  has_price           BOOLEAN DEFAULT FALSE,
  has_urgency_words   BOOLEAN DEFAULT FALSE,

  -- Descrição de cena
  scene_description   TEXT,
  key_visual_elements TEXT[],

  -- Meta da análise
  analyzed_at         TIMESTAMPTZ DEFAULT NOW(),
  llm_model_used      VARCHAR(100),
  llm_confidence      DECIMAL(3,2) DEFAULT 0.80,
  raw_analysis        JSONB,
  analysis_status     VARCHAR(20) DEFAULT 'pending',  -- pending|running|done|failed
  error_message       TEXT,

  UNIQUE(asset_id)
);

CREATE INDEX IF NOT EXISTS idx_creative_analysis_asset   ON campanhasmarketingdigital."CreativeAnalysis"(asset_id);
CREATE INDEX IF NOT EXISTS idx_creative_analysis_pattern ON campanhasmarketingdigital."CreativeAnalysis"(hook_type, is_ugc_style, tenant_id);
CREATE INDEX IF NOT EXISTS idx_creative_analysis_status  ON campanhasmarketingdigital."CreativeAnalysis"(analysis_status);

-- 3. View: correlaciona padrões de criativo × performance
CREATE OR REPLACE VIEW campanhasmarketingdigital.vw_creative_patterns AS
SELECT
  ca.tenant_id,
  ca.hook_type,
  ca.is_ugc_style,
  ca.angle,
  ca.emotional_tone,
  ca.is_corporate_style,
  COUNT(DISTINCT a.id)              AS ads_count,
  ROUND(AVG(i.ctr)::numeric, 2)     AS avg_ctr,
  ROUND(AVG(i.cpc)::numeric, 2)     AS avg_cpc,
  ROUND(SUM(i.spend)::numeric, 2)   AS total_spend,
  ROUND(AVG(i.spend / NULLIF(
    (SELECT COUNT(*) FROM campanhasmarketingdigital."Lead" l
     WHERE l."campaignId" = i."campaignId"), 0
  ))::numeric, 2)                   AS avg_cpl,
  json_agg(DISTINCT jsonb_build_object(
    'assetId',    asset.id,
    'adId',       a.id,
    'adName',     a.name,
    'storageUrl', asset.storage_url
  )) FILTER (WHERE a.id IS NOT NULL) AS sample_ads
FROM campanhasmarketingdigital."CreativeAnalysis" ca
JOIN campanhasmarketingdigital."CreativeAsset" asset ON asset.id = ca.asset_id
JOIN campanhasmarketingdigital."Ad" a ON a.id = asset.ad_id
JOIN campanhasmarketingdigital."AdSet" ads ON ads.id = a."adSetId"
JOIN campanhasmarketingdigital."Insight" i ON i."campaignId" = ads."campaignId"
WHERE ca.hook_type IS NOT NULL
  AND ca.analysis_status = 'done'
  AND asset.is_active = TRUE
GROUP BY ca.tenant_id, ca.hook_type, ca.is_ugc_style, ca.angle, ca.emotional_tone, ca.is_corporate_style
HAVING COUNT(DISTINCT a.id) >= 1;

-- 4. Prompts para análise e geração de criativos
INSERT INTO system_prompt_templates (segment_id, template_key, version, title, content, variables, is_active)
VALUES
  (NULL, 'creative_analysis_vision', 1,
   'Análise Visual de Criativo (Vision LLM)',
   'Você é um especialista em análise de criativos para anúncios de performance digital.
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
}',
   '{}', true),

  (NULL, 'creative_concept_generator', 1,
   'Gerador de Conceitos de Criativos',
   'Você é um especialista em criação de anúncios para o segmento {{segment}}.

Com base no padrão vencedor abaixo, gere 5 conceitos de novos criativos para o mesmo segmento.

PADRÃO VENCEDOR:
- Estilo: {{style}}
- Hook: {{hook_type}}
- Ângulo: {{angle}}
- Tom emocional: {{emotional_tone}}
- CTR médio: {{avg_ctr}}%
- CPL médio: R$ {{avg_cpl}}
- Número de anúncios testados: {{ads_count}}

Retorne APENAS este JSON válido:
{
  "concepts": [
    {
      "format": "image|video_15s|video_30s|carousel",
      "scene": "descrição visual detalhada da cena",
      "hook_text": "texto de abertura (primeiros 3 segundos ou primeira linha)",
      "body": "texto do anúncio (2-3 frases diretas)",
      "headline": "headline impactante (máx 40 chars)",
      "cta": "texto do CTA",
      "why_it_works": "motivo breve baseado no padrão vencedor"
    }
  ]
}',
   '["segment","style","hook_type","angle","emotional_tone","avg_ctr","avg_cpl","ads_count"]', true)

ON CONFLICT DO NOTHING;

-- 5. Atualizar feature existente "importacao-criativos" → "Galeria de Criativos"
UPDATE system_features
SET
  name        = 'Galeria de Criativos',
  description = 'Biblioteca de criativos com análise de IA, tags automáticas e padrões de performance',
  icon        = 'PhotoIcon'
WHERE slug = 'importacao-criativos';

-- 6. Adicionar modelos Groq com suporte Vision (free tier)
INSERT INTO campanhasmarketingdigital."LlmModel"
  (id, provider, provider_label, model_id, model_label, base_url, is_free, is_active, is_recommended, notes, sort_order)
VALUES
  (gen_random_uuid(), 'groq', 'Groq', 'meta-llama/llama-4-scout-17b-16e-instruct',    'Llama 4 Scout 17B (Vision)',    'https://api.groq.com/openai/v1', true, true,  true,  'Suporte a Vision (imagens). Free tier. Recomendado para análise de criativos.', 50),
  (gen_random_uuid(), 'groq', 'Groq', 'meta-llama/llama-4-maverick-17b-128e-instruct', 'Llama 4 Maverick 17B (Vision)', 'https://api.groq.com/openai/v1', true, false, false, 'Requer acesso especial no Groq (não disponível no free tier padrão).', 51)
ON CONFLICT DO NOTHING;

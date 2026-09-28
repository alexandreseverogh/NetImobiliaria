-- Migração: 2026-09-28
-- Troca o modelo LLM GLOBAL do módulo de Campanhas (Groq → Gemini), pra destravar Vision
-- (análise de imagem dos criativos) — Groq não tem nenhum modelo com suporte a Vision hoje.
-- Esta é a MESMA linha (tenant_id IS NULL) usada tanto pro texto (briefing/insights/
-- agentDecisor) quanto pra Vision (creativeAnalysisService), por design.
--
-- IMPORTANTE — trocar antes de rodar:
--   Substituir '<GEMINI_API_KEY_REAL>' pela chave real do Gemini (a mesma já usada em
--   GEMINI_API_KEY no .env local/VPS — se a VPS já tiver essa env var, pode confirmar o valor
--   com: docker exec netimobiliaria-app printenv GEMINI_API_KEY).
--
-- Idempotente — pode rodar mais de uma vez sem duplicar nem quebrar nada.

BEGIN;

-- 1. Config global (tenant_id IS NULL)
UPDATE campanhasmarketingdigital."Settings"
SET "llmProvider" = 'gemini',
    "llmModel"    = 'gemini-3.8-flash',
    "llmApiKey"   = '<GEMINI_API_KEY_REAL>'
WHERE tenant_id IS NULL;

-- 2. Desativa no catálogo os modelos Gemini confirmados mortos (ausentes da lista real
--    retornada por GET https://generativelanguage.googleapis.com/v1beta/openai/models com
--    esta mesma chave, em 2026-09-28) — evita qualquer tenant escolher um modelo morto na
--    tela de Configurações pela UI.
UPDATE campanhasmarketingdigital."LlmModel"
SET is_active = false, is_recommended = false
WHERE provider = 'gemini' AND model_id = ANY(ARRAY['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro']);

-- 3. Cadastra gemini-3.8-flash no catálogo (não existia antes desta sessão) como o
--    recomendado do provider — sem constraint única em (provider, model_id), por isso o
--    upsert manual via SELECT antes.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM campanhasmarketingdigital."LlmModel"
    WHERE provider = 'gemini' AND model_id = 'gemini-3.8-flash'
  ) THEN
    INSERT INTO campanhasmarketingdigital."LlmModel"
      (id, provider, provider_label, model_id, model_label, base_url,
       quality_score, is_free, context_window, is_active, is_recommended, sort_order)
    VALUES (gen_random_uuid(), 'gemini', 'Google Gemini', 'gemini-3.8-flash',
            'Gemini 3.8 Flash', 'https://generativelanguage.googleapis.com/v1beta/openai/',
            7, false, 1000000, true, true, 0);
  ELSE
    UPDATE campanhasmarketingdigital."LlmModel"
    SET is_active = true, is_recommended = true
    WHERE provider = 'gemini' AND model_id = 'gemini-3.8-flash';
  END IF;
END $$;

-- 4. gemini-flash-latest (o alias "automático" do Google) deixa de ser o recomendado —
--    mostrou instabilidade real (503 repetido) no teste ao vivo desta sessão; continua ATIVO
--    (é um modelo real e válido, só não é mais a escolha default enquanto a instabilidade
--    persistir).
UPDATE campanhasmarketingdigital."LlmModel"
SET is_recommended = false
WHERE provider = 'gemini' AND model_id = 'gemini-flash-latest';

COMMIT;

-- Verificação pós-migração:
-- SELECT tenant_id, "llmProvider", "llmModel" FROM campanhasmarketingdigital."Settings" WHERE tenant_id IS NULL;
-- SELECT provider, model_id, is_active, is_recommended FROM campanhasmarketingdigital."LlmModel" WHERE provider = 'gemini' ORDER BY sort_order;

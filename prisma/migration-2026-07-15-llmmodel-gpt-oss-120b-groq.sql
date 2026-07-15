-- Registra o gpt-oss-120b (modelo open-weight da OpenAI, hospedado no Groq) no catálogo —
-- testando como alternativa mais confiável de tool-calling ao llama-3.3-70b-versatile (que não
-- usa o tool-calling estruturado da API) e ao llama-4-scout-17b (que às vezes pula a chamada).
-- moonshotai/kimi-k2 não está disponível nesta conta Groq (confirmado via /v1/models).

INSERT INTO campanhasmarketingdigital."LlmModel"
  (id, provider, provider_label, model_id, model_label, base_url,
   quality_score, is_free, context_window, is_recommended, sort_order)
VALUES (gen_random_uuid(), 'groq', 'Groq', 'openai/gpt-oss-120b',
        'GPT-OSS 120B', 'https://api.groq.com/openai/v1', 4, true, 131072, false, 7)
ON CONFLICT DO NOTHING;

-- Registra gemini-flash-latest (alias sempre-atual pro Flash mais recente) — confirmado
-- funcionando via teste direto com a GEMINI_API_KEY já provisionada na plataforma.
-- gemini-2.5-flash retornou 404 (não disponível pra esta conta) e gemini-2.0-flash-001
-- retornou 429 com limite 0 no free tier — só o alias "-latest" funcionou nesta conta.

INSERT INTO campanhasmarketingdigital."LlmModel"
  (id, provider, provider_label, model_id, model_label, base_url,
   quality_score, is_free, context_window, is_recommended, sort_order)
VALUES (gen_random_uuid(), 'gemini', 'Google Gemini', 'gemini-flash-latest',
        'Gemini Flash (latest)', 'https://generativelanguage.googleapis.com/v1beta/openai/', 4, true, 1048576, false, 1)
ON CONFLICT DO NOTHING;

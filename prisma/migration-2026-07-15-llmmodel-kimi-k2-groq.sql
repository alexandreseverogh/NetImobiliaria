-- Registra o Kimi K2 hospedado no Groq (moonshotai/kimi-k2-instruct-0905) no catálogo de
-- modelos — divulgado como forte em tool-calling/agentic tasks, testando como alternativa ao
-- llama-3.3-70b-versatile (que não usa o tool-calling estruturado da API, escreve a chamada
-- como texto solto) e ao llama-4-scout-17b (que às vezes pula a chamada de ferramenta).

INSERT INTO campanhasmarketingdigital."LlmModel"
  (id, provider, provider_label, model_id, model_label, base_url,
   quality_score, is_free, context_window, is_recommended, sort_order)
VALUES (gen_random_uuid(), 'groq', 'Groq', 'moonshotai/kimi-k2-instruct-0905',
        'Kimi K2 Instruct (0905)', 'https://api.groq.com/openai/v1', 4, true, 262144, false, 6)
ON CONFLICT DO NOTHING;

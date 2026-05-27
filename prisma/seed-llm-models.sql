CREATE TABLE IF NOT EXISTS campanhasmarketingdigital."LlmModel" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  provider        TEXT NOT NULL,
  provider_label  TEXT NOT NULL,
  model_id        TEXT NOT NULL,
  model_label     TEXT NOT NULL,
  base_url        TEXT,
  quality_score   INTEGER NOT NULL DEFAULT 3,
  is_free         BOOLEAN NOT NULL DEFAULT false,
  context_window  INTEGER,
  is_recommended  BOOLEAN NOT NULL DEFAULT false,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  notes           TEXT,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "LlmModel_provider_idx" ON campanhasmarketingdigital."LlmModel"(provider);
CREATE INDEX IF NOT EXISTS "LlmModel_isActive_idx" ON campanhasmarketingdigital."LlmModel"(is_active);

DELETE FROM campanhasmarketingdigital."LlmModel";

INSERT INTO campanhasmarketingdigital."LlmModel"
  (id, provider, provider_label, model_id, model_label, base_url, quality_score, is_free, context_window, is_recommended, notes, sort_order)
VALUES
  (gen_random_uuid()::text, 'anthropic', 'Anthropic', 'claude-sonnet-4-5',    'Claude Sonnet 4.5 (recomendado)',    NULL, 5, false, 200000, true,  'Melhor equilibrio qualidade/custo para analise imobiliaria', 10),
  (gen_random_uuid()::text, 'anthropic', 'Anthropic', 'claude-haiku-3-5',     'Claude Haiku 3.5 (economico)',       NULL, 4, false, 200000, false, 'Rapido e barato, bom para briefings simples', 11),
  (gen_random_uuid()::text, 'anthropic', 'Anthropic', 'claude-opus-4-5',      'Claude Opus 4.5 (maxima qualidade)', NULL, 5, false, 200000, false, 'Maxima capacidade analitica, custo elevado', 12),
  (gen_random_uuid()::text, 'openai',    'OpenAI',    'gpt-4o',               'GPT-4o',                             'https://api.openai.com/v1', 5, false, 128000, false, 'Excelente para analise complexa', 20),
  (gen_random_uuid()::text, 'openai',    'OpenAI',    'gpt-4o-mini',          'GPT-4o Mini (economico)',             'https://api.openai.com/v1', 4, false, 128000, false, 'Bom custo-beneficio', 21),
  (gen_random_uuid()::text, 'openai',    'OpenAI',    'o3-mini',              'o3-mini (raciocinio)',                'https://api.openai.com/v1', 5, false,  32000, false, 'Ideal para analises que exigem raciocinio encadeado', 22),
  (gen_random_uuid()::text, 'gemini',    'Google Gemini', 'gemini-1.5-flash', 'Gemini 1.5 Flash (gratis)',          'https://generativelanguage.googleapis.com/v1beta/openai/', 4, true,  1000000, false, '1M tokens de contexto. Tier gratis: 1M tokens/dia', 30),
  (gen_random_uuid()::text, 'gemini',    'Google Gemini', 'gemini-2.0-flash', 'Gemini 2.0 Flash (gratis)',          'https://generativelanguage.googleapis.com/v1beta/openai/', 4, true,  1000000, false, 'Versao mais recente, gratuito. Tier gratis: 1M tokens/dia', 31),
  (gen_random_uuid()::text, 'gemini',    'Google Gemini', 'gemini-1.5-pro',   'Gemini 1.5 Pro',                     'https://generativelanguage.googleapis.com/v1beta/openai/', 5, false, 2000000, false, 'Alta qualidade, contexto de 2M tokens', 32),
  (gen_random_uuid()::text, 'groq',      'Groq',      'llama-3.3-70b-versatile', 'Llama 3.3 70B (gratis)',          'https://api.groq.com/openai/v1', 3, true,  128000, false, 'Muito rapido. Tier gratis: 14.400 tokens/min', 40),
  (gen_random_uuid()::text, 'groq',      'Groq',      'llama-3.1-70b-versatile', 'Llama 3.1 70B (gratis)',          'https://api.groq.com/openai/v1', 3, true,  128000, false, 'Alternativa estavel. Tier gratis: 14.400 tokens/min', 41),
  (gen_random_uuid()::text, 'groq',      'Groq',      'mixtral-8x7b-32768',   'Mixtral 8x7B (gratis)',              'https://api.groq.com/openai/v1', 3, true,   32768, false, 'Bom para respostas JSON. Tier gratis: 5.000 tokens/min', 42),
  (gen_random_uuid()::text, 'deepseek',  'DeepSeek',  'deepseek-chat',        'DeepSeek-V3 (ultra economico)',      'https://api.deepseek.com/v1', 4, false, 64000, false, '~R$0,40/milhao tokens. Excelente custo-beneficio', 50),
  (gen_random_uuid()::text, 'deepseek',  'DeepSeek',  'deepseek-reasoner',    'DeepSeek-R1 (raciocinio)',            'https://api.deepseek.com/v1', 4, false, 64000, false, 'Modelo de raciocinio encadeado, otimo para analises complexas', 51),
  (gen_random_uuid()::text, 'openrouter','OpenRouter', 'meta-llama/llama-3.1-8b-instruct:free', 'Llama 3.1 8B (gratis via OpenRouter)', 'https://openrouter.ai/api/v1', 2, true,  128000, false, 'Gratis, menor qualidade analitica. Cadastro em openrouter.ai', 60),
  (gen_random_uuid()::text, 'openrouter','OpenRouter', 'google/gemini-flash-1.5', 'Gemini Flash 1.5 via OpenRouter', 'https://openrouter.ai/api/v1', 4, false, 1000000, false, 'Acesso ao Gemini via OpenRouter com uma unica API key', 61),
  (gen_random_uuid()::text, 'openrouter','OpenRouter', 'anthropic/claude-3.5-haiku', 'Claude Haiku via OpenRouter',  'https://openrouter.ai/api/v1', 4, false, 200000, false, 'Acesso ao Claude via OpenRouter', 62),
  (gen_random_uuid()::text, 'kimi',      'Kimi (Moonshot AI)', 'moonshot-v1-8k',   'Moonshot v1 8k',               'https://api.moonshot.cn/v1', 3, false,   8000, false, 'Modelo chines, bom para portugues. Contexto 8k.', 70),
  (gen_random_uuid()::text, 'kimi',      'Kimi (Moonshot AI)', 'moonshot-v1-32k',  'Moonshot v1 32k',              'https://api.moonshot.cn/v1', 3, false,  32000, false, 'Contexto longo, ideal para multiplas campanhas.', 71),
  (gen_random_uuid()::text, 'kimi',      'Kimi (Moonshot AI)', 'moonshot-v1-128k', 'Moonshot v1 128k',             'https://api.moonshot.cn/v1', 3, false, 128000, false, 'Contexto muito longo. API: platform.moonshot.cn', 72),
  (gen_random_uuid()::text, 'qwen',      'Qwen (Alibaba)', 'qwen-plus',        'Qwen Plus (gratis na cota)',        'https://dashscope.aliyuncs.com/compatible-mode/v1', 3, true,  131072, false, 'Tier gratis disponivel. API: dashscope.aliyuncs.com', 80),
  (gen_random_uuid()::text, 'qwen',      'Qwen (Alibaba)', 'qwen-max',         'Qwen Max',                         'https://dashscope.aliyuncs.com/compatible-mode/v1', 4, false, 131072, false, 'Melhor modelo Qwen, bom raciocinio', 81),
  (gen_random_uuid()::text, 'qwen',      'Qwen (Alibaba)', 'qwen-turbo',       'Qwen Turbo (economico)',            'https://dashscope.aliyuncs.com/compatible-mode/v1', 3, false,  32000, false, 'Versao rapida e barata', 82);

SELECT COUNT(*) as total_modelos FROM campanhasmarketingdigital."LlmModel";

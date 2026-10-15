-- Migra a chave de API usada pelos embeddings do RAG (Mensageria, Base de Conhecimento) do
-- .env pra uma config gerenciável via UI pelo Master — mesmo padrão já usado para LLM de chat
-- (llmApiKey) e Geração de Imagens (imageApiKey), ambos na linha global de Settings
-- (tenant_id IS NULL).
--
-- Contexto: embedText() (src/lib/marketing/services/llmClient.ts) sempre caiu de volta pro
-- GEMINI_API_KEY do .env quando o tenant não tinha config própria de provider='gemini' — ponto
-- real de dependência de arquivo de configuração que o Master não conseguia editar pela UI.
-- Modelo (gemini-embedding-001) continua fixo em código de propósito — a dimensão do vetor
-- (768) está acoplada ao schema de knowledge_chunks (coluna vector(768)); trocar de modelo
-- exigiria migração de schema + reprocessar todo embedding já gerado, não é uma escolha
-- livre via dropdown como provider/modelo de chat.

ALTER TABLE campanhasmarketingdigital."Settings"
  ADD COLUMN IF NOT EXISTS "embeddingApiKey" TEXT;

COMMENT ON COLUMN campanhasmarketingdigital."Settings"."embeddingApiKey" IS
  'Chave Gemini usada por embedText() (RAG — Base de Conhecimento da Mensageria). Só tem efeito na linha global (tenant_id IS NULL), gerenciada em /admin/master/ia-plataforma. Modelo fixo (gemini-embedding-001) — ver comentário no código.';

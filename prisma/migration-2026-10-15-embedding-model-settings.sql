-- Settings.embeddingModel — o modelo ATIVO agora (o que embedText() de fato usa pra gerar
-- vetor novo, e o que searchKnowledge() filtra na busca). NULL = usa o default de código
-- (GEMINI_EMBEDDING_MODEL, llmClient.ts) — preserva 100% o comportamento atual sem exigir
-- que o Master configure nada pra continuar funcionando.
--
-- Continuação da fundação de migration-2026-10-15-knowledge-chunks-embedding-model.sql: aquela
-- migração deu a CADA CHUNK um identificador de modelo; esta dá à PLATAFORMA um identificador
-- de modelo ATIVO, editável pelo Master — a peça que falta pra um troca de modelo ser uma ação
-- real (não só dado passivo).

ALTER TABLE campanhasmarketingdigital."Settings"
  ADD COLUMN IF NOT EXISTS "embeddingModel" TEXT;

COMMENT ON COLUMN campanhasmarketingdigital."Settings"."embeddingModel" IS
  'Modelo ativo de embedding (RAG). NULL = usa o default de código. Só tem efeito na linha global (tenant_id IS NULL). Trocar NÃO revetoriza conteúdo já processado — ver rotina de reprocessamento (pendente, docs/CHECKPOINT.md).';

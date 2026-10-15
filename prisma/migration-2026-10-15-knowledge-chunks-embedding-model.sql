-- Fundação pra troca futura e segura de modelo de embedding (sem ela implementada ainda —
-- só a plumbing de dados/busca que a torna possível sem corromper resultado).
--
-- Cada chunk passa a registrar QUAL modelo gerou aquele vetor. Hoje só existe 1 modelo
-- (gemini-embedding-001, único já usado desde que a Base de Conhecimento existe — backfill
-- real, não um chute), mas a partir daqui a tabela já suporta vetores de modelos diferentes
-- convivendo sem nunca serem comparados entre si (ver filtro adicionado em searchKnowledge(),
-- src/lib/mensageria/tools/knowledgeBase.ts) — o que torna uma futura troca de modelo segura:
-- um job de reprocessamento pode rodar em background, re-tag chunk a chunk, sem nenhuma janela
-- de resultado de busca matematicamente incorreto (silencioso) — só degradação visível e
-- temporária (chunk ainda não migrado simplesmente não aparece até ser reprocessado).

ALTER TABLE mensageria.knowledge_chunks
  ADD COLUMN IF NOT EXISTS embedding_model VARCHAR(100) NOT NULL DEFAULT 'gemini-embedding-001';

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_model
  ON mensageria.knowledge_chunks (embedding_model);

COMMENT ON COLUMN mensageria.knowledge_chunks.embedding_model IS
  'Qual modelo gerou o vetor desta linha — nunca comparado contra vetor de modelo diferente (ver searchKnowledge()). Fundação pra troca segura de modelo/provider no futuro, sem corromper busca em andamento.';

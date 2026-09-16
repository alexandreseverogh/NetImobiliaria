-- M4.3 — RAG / Base de Conhecimento (docs/PLANO_MENSAGERIA.md §14.6-B).
-- Conhecimento não-estruturado (políticas, FAQ, condições comerciais) por tenant/cliente,
-- consultado pelo bot como uma ferramenta a mais (buscar_conhecimento) via busca híbrida
-- (vetorial pgvector + full-text tsvector).
--
-- Pré-requisito: imagem do Postgres com pgvector (docker/postgres/Dockerfile). Idempotente.

CREATE EXTENSION IF NOT EXISTS vector;

-- ── Documentos (FONTE-DA-VERDADE, editável pelo admin do tenant) ──────────────────────────────
-- Escopo: tenant_id sempre; client_id NULL = vale pra todos os clientes do tenant (herança
-- tenant→cliente, mesmo padrão de inboxes/bot_flows). O tenant edita a KB dele E a dos clientes
-- sob seu guarda-chuva.
CREATE TABLE IF NOT EXISTS mensageria.knowledge_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  client_id uuid,
  title text NOT NULL,
  source_type text NOT NULL DEFAULT 'markdown',   -- 'markdown' | 'pdf_import' | 'docx_import'
  raw_markdown text NOT NULL,                       -- conteúdo canônico editável
  original_filename text,                           -- preenchido quando veio de upload
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS knowledge_documents_scope
  ON mensageria.knowledge_documents (tenant_id, client_id, is_active);

-- ── Chunks (ARTEFATO DE RECUPERAÇÃO, derivado — regenerado a cada save do documento) ──────────
-- tenant_id/client_id desnormalizados do documento pra filtrar o escopo sem JOIN na hora da busca.
CREATE TABLE IF NOT EXISTS mensageria.knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES mensageria.knowledge_documents(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL,
  client_id uuid,
  chunk_index int NOT NULL DEFAULT 0,
  heading_path text,                                -- "Vendas > Financiamento" (retrieval contextual)
  chunk_text text NOT NULL,                          -- texto JÁ com o prefixo de heading_path
  embedding vector(768),                             -- Gemini gemini-embedding-001 truncado p/ 768 dims (Matryoshka; dim fixa — trocar modelo/dim exige ALTER + re-embed)
  tsv tsvector GENERATED ALWAYS AS (to_tsvector('portuguese', chunk_text)) STORED,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índice vetorial HNSW (melhor recall que ivfflat, sem passo de treino, bom pra inserts
-- incrementais — a KB é editada com frequência). Distância cosseno.
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw
  ON mensageria.knowledge_chunks USING hnsw (embedding vector_cosine_ops);

-- Índice full-text (busca híbrida — pega termos exatos que o vetor sozinho erra: nomes,
-- siglas, "convênio Unimed", "financiamento Caixa").
CREATE INDEX IF NOT EXISTS knowledge_chunks_tsv_gin
  ON mensageria.knowledge_chunks USING gin (tsv);

-- Escopo (o filtro forçado no servidor em toda busca).
CREATE INDEX IF NOT EXISTS knowledge_chunks_scope
  ON mensageria.knowledge_chunks (tenant_id, client_id);

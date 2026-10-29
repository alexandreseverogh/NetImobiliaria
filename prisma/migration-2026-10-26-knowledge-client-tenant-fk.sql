-- Fecha gap de segregação por tenant/cliente da Base de Conhecimento (RAG, M4.3): hoje nada no
-- banco impede gravar `knowledge_documents.client_id` apontando pra um cliente de OUTRO tenant —
-- mitigado só pela UI (o combobox de seleção de cliente já filtra por tenant_id do JWT), sem
-- garantia real no schema. Adiciona FK composta (tenant_id, client_id) → clientes(tenant_id, uuid)
-- pra tornar essa combinação inválida impossível de persistir, não só "nunca oferecida na tela".
--
-- client_id continua nullable (= documento vale pra todos os clientes do tenant) — FK composta
-- com qualquer coluna NULL nunca é validada pelo Postgres (MATCH SIMPLE, o default), então essa
-- semântica é preservada sem nenhum caso especial.
--
-- ON DELETE SET NULL (não CASCADE): remover um cliente nunca deve apagar o conteúdo da base de
-- conhecimento associada a ele — o documento só "sobe" pra tenant-wide, continua disponível.
--
-- Idempotente. Verificado antes de escrever: 0 linhas órfãs em produção/dev (nenhum
-- knowledge_documents.client_id aponta hoje pra um cliente de tenant diferente).

-- Pré-requisito do FK composto: unique index exatamente nas 2 colunas referenciadas (uuid já é
-- PK sozinho — isto é redundante em termos de unicidade, mas o Postgres exige o índice composto
-- explícito pra aceitar uma FK composta apontando pra ele).
CREATE UNIQUE INDEX IF NOT EXISTS clientes_tenant_uuid_uq
  ON public.clientes (tenant_id, uuid);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'knowledge_documents_client_same_tenant'
  ) THEN
    ALTER TABLE mensageria.knowledge_documents
      ADD CONSTRAINT knowledge_documents_client_same_tenant
      FOREIGN KEY (tenant_id, client_id)
      REFERENCES public.clientes (tenant_id, uuid)
      ON DELETE SET NULL;
  END IF;
END $$;

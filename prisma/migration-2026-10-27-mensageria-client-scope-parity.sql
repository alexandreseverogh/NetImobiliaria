-- Paridade de escopo tenant/cliente em TODA a aba Mensageria → Configurações.
--
-- Achado real: só Bot e Base de Conhecimento tinham a opção de editar por cliente na UI. Inboxes
-- e SLA Policies já tinham a coluna `client_id` no schema, mas NUNCA usada em código nenhum (API
-- sempre gravava/filtrava NULL) — dado morto. Times, Etiquetas e Respostas Rápidas nem tinham a
-- coluna. Esta migração fecha os dois gaps, no mesmo padrão já usado (e testado) em
-- bot_flows/knowledge_documents: client_id NULL = vale pra todo o tenant; setado = só aquele
-- cliente. Idempotente.
--
-- De brinde, fecha também a mesma lacuna de integridade já corrigida em knowledge_documents
-- (migration-2026-10-26) pras 2 tabelas que já tinham client_id mas nunca ganharam a FK composta:
-- bot_flows e sla_policies nunca tiveram garantia nenhuma no banco de que o client_id gravado
-- pertence ao MESMO tenant — confirmado 0 linhas órfãs antes de aplicar.

-- ── Pré-requisito já existe (criado em migration-2026-10-26): clientes_tenant_uuid_uq ──────────
-- (CREATE UNIQUE INDEX IF NOT EXISTS clientes_tenant_uuid_uq ON public.clientes (tenant_id, uuid))
CREATE UNIQUE INDEX IF NOT EXISTS clientes_tenant_uuid_uq ON public.clientes (tenant_id, uuid);

-- ── 1. FK composta nas 2 tabelas que já tinham client_id, nunca protegidas ─────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bot_flows_client_same_tenant') THEN
    ALTER TABLE mensageria.bot_flows
      ADD CONSTRAINT bot_flows_client_same_tenant
      FOREIGN KEY (tenant_id, client_id) REFERENCES public.clientes (tenant_id, uuid) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inboxes_client_same_tenant') THEN
    ALTER TABLE mensageria.inboxes
      ADD CONSTRAINT inboxes_client_same_tenant
      FOREIGN KEY (tenant_id, client_id) REFERENCES public.clientes (tenant_id, uuid) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sla_policies_client_same_tenant') THEN
    ALTER TABLE mensageria.sla_policies
      ADD CONSTRAINT sla_policies_client_same_tenant
      FOREIGN KEY (tenant_id, client_id) REFERENCES public.clientes (tenant_id, uuid) ON DELETE SET NULL;
  END IF;
END $$;

-- ── 2. Times — client_id novo. NULL = time atende qualquer cliente; setado = dedicado a um só.
-- Usado pra impedir (validado em código) vincular um time dedicado ao Cliente A numa inbox do
-- Cliente B — ver inboxes/[id]/route.ts.
ALTER TABLE mensageria.teams ADD COLUMN IF NOT EXISTS client_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_client_same_tenant') THEN
    ALTER TABLE mensageria.teams
      ADD CONSTRAINT teams_client_same_tenant
      FOREIGN KEY (tenant_id, client_id) REFERENCES public.clientes (tenant_id, uuid) ON DELETE SET NULL;
  END IF;
END $$;

-- ── 3. Etiquetas — client_id novo. NULL = etiqueta disponível em qualquer conversa do tenant;
-- setado = só aparece/aplicável em conversas daquele cliente (filtrado no picker da thread).
ALTER TABLE mensageria.labels ADD COLUMN IF NOT EXISTS client_id uuid;

-- labels_tenant_name nasceu como UNIQUE(...) inline no CREATE TABLE original — isso cria um
-- índice, não uma table constraint nomeada; DROP CONSTRAINT não o encontra (confirmado ao
-- aplicar), tem que ser DROP INDEX.
DROP INDEX IF EXISTS mensageria.labels_tenant_name;
CREATE UNIQUE INDEX IF NOT EXISTS labels_tenant_client_name
  ON mensageria.labels (tenant_id, COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid), name);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'labels_client_same_tenant') THEN
    ALTER TABLE mensageria.labels
      ADD CONSTRAINT labels_client_same_tenant
      FOREIGN KEY (tenant_id, client_id) REFERENCES public.clientes (tenant_id, uuid) ON DELETE SET NULL;
  END IF;
END $$;

-- ── 4. Respostas Rápidas — client_id novo. Mesma semântica: NULL = qualquer conversa do tenant;
-- setado = só sugerido no composer de conversas daquele cliente.
ALTER TABLE mensageria.canned_responses ADD COLUMN IF NOT EXISTS client_id uuid;

-- Mesmo caso de labels_tenant_name acima — índice inline, não constraint nomeada.
DROP INDEX IF EXISTS mensageria.canned_tenant_shortcut;
CREATE UNIQUE INDEX IF NOT EXISTS canned_tenant_client_shortcut
  ON mensageria.canned_responses (tenant_id, COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid), shortcut);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'canned_responses_client_same_tenant') THEN
    ALTER TABLE mensageria.canned_responses
      ADD CONSTRAINT canned_responses_client_same_tenant
      FOREIGN KEY (tenant_id, client_id) REFERENCES public.clientes (tenant_id, uuid) ON DELETE SET NULL;
  END IF;
END $$;

-- ── 5. Conversas precisam expor client_id pro front filtrar etiquetas/respostas rápidas
-- aplicáveis — a coluna já existe (confirmado); só o índice de apoio é novo.
CREATE INDEX IF NOT EXISTS idx_mensageria_conversations_client ON mensageria.conversations (tenant_id, client_id);

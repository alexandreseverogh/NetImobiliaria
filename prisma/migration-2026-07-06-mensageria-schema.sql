-- ============================================================
-- Migration 2026-07-06: Módulo Mensageria — schema completo
-- Ver docs/PLANO_MENSAGERIA.md (seções 4, 14.1, 14.3, 14.4, 14.6)
--
-- Cria o schema `mensageria` inteiro nesta migração (núcleo + times/labels +
-- SLA + bot + RAG), mas o CÓDIGO que usa cada tabela chega em fases
-- progressivas (M0 núcleo -> M3 times/SLA -> M4 bot -> M5 analytics).
-- Idempotente: pode rodar mais de uma vez sem duplicar.
-- ============================================================

BEGIN;

CREATE SCHEMA IF NOT EXISTS mensageria;

-- ============================================================
-- 1. NÚCLEO — inboxes, contacts, conversations, messages (M0)
-- ============================================================

-- Canal de entrada/saída (1 por WhatsApp/tenant, 1 webform, 1 manual, 1 chatbot, 1 webchat...)
CREATE TABLE IF NOT EXISTS mensageria.inboxes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL,
  client_id    uuid,                        -- null = próprio do tenant
  name         text NOT NULL,
  channel_type text NOT NULL,                -- 'whatsapp' | 'webform' | 'manual' | 'chatbot' | 'webchat'
  provider     text NOT NULL DEFAULT 'evolution', -- discriminador de provider (14.1): 'evolution' | 'meta_cloud' | 'zapi' | 'internal'
  config       jsonb NOT NULL DEFAULT '{}',  -- credenciais/endpoints específicos do provider
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inboxes_tenant ON mensageria.inboxes (tenant_id, is_active);

-- Contato: identidade unificada de quem escreve (dedupe por telefone/email no tenant)
CREATE TABLE IF NOT EXISTS mensageria.contacts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL,
  client_id   uuid,
  name        text,
  phone       text,                          -- normalizado (dígitos, sem símbolos)
  email       text,
  avatar_url  text,
  lead_uuid   uuid,                          -- SOFT LINK p/ leads_staging.lead_uuid (desacoplado, sem FK físico)
  attributes  jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS contacts_tenant_phone ON mensageria.contacts (tenant_id, phone) WHERE phone IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS contacts_tenant_email ON mensageria.contacts (tenant_id, email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_lead_uuid ON mensageria.contacts (lead_uuid) WHERE lead_uuid IS NOT NULL;

-- Times (declarada antes de conversations por causa da FK team_id)
CREATE TABLE IF NOT EXISTS mensageria.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  auto_assign boolean NOT NULL DEFAULT true,  -- round-robin de atribuição
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Conversa: uma thread por contato × inbox
CREATE TABLE IF NOT EXISTS mensageria.conversations (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL,
  client_id          uuid,
  inbox_id           uuid NOT NULL REFERENCES mensageria.inboxes(id),
  contact_id         uuid NOT NULL REFERENCES mensageria.contacts(id),
  status             text NOT NULL DEFAULT 'open',  -- open | pending | snoozed | resolved
  priority           text,                          -- low | medium | high | urgent
  assignee_id        uuid,                          -- public.users.id (atendente responsável)
  team_id            uuid REFERENCES mensageria.teams(id),
  handled_by_bot     boolean NOT NULL DEFAULT false,
  last_message_at    timestamptz,
  first_response_at  timestamptz,                   -- p/ SLA (tempo de 1ª resposta)
  resolved_at        timestamptz,
  unread_count       int NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS conv_inbox_status ON mensageria.conversations (tenant_id, inbox_id, status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS conv_assignee ON mensageria.conversations (assignee_id, status);
CREATE INDEX IF NOT EXISTS conv_contact ON mensageria.conversations (contact_id, status);

-- Mensagem: cada bolha da thread
CREATE TABLE IF NOT EXISTS mensageria.messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       uuid NOT NULL,
  conversation_id uuid NOT NULL REFERENCES mensageria.conversations(id) ON DELETE CASCADE,
  direction       text NOT NULL,                 -- inbound | outbound
  sender_type     text NOT NULL,                 -- contact | agent | bot | system
  sender_id       uuid,                          -- public.users.id quando agent
  content         text,
  content_type    text NOT NULL DEFAULT 'text',  -- text | image | file | audio | template | note
  attachments     jsonb NOT NULL DEFAULT '[]',
  external_id     text,                          -- id da mensagem no provider (idempotência)
  delivery_status text NOT NULL DEFAULT 'sent',  -- sent | delivered | read | failed
  is_private      boolean NOT NULL DEFAULT false,-- nota interna (não vai ao contato)
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS messages_external ON mensageria.messages (tenant_id, external_id) WHERE external_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS messages_conv ON mensageria.messages (conversation_id, created_at);

-- ============================================================
-- 2. TIMES, COLABORAÇÃO E PRODUTIVIDADE (código chega em M3)
-- ============================================================

CREATE TABLE IF NOT EXISTS mensageria.team_members (
  team_id uuid NOT NULL REFERENCES mensageria.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,                            -- public.users.id
  role    text NOT NULL DEFAULT 'agent',            -- agent | lead
  PRIMARY KEY (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS mensageria.labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#c5a028'
);
CREATE UNIQUE INDEX IF NOT EXISTS labels_tenant_name ON mensageria.labels (tenant_id, name);

CREATE TABLE IF NOT EXISTS mensageria.conversation_labels (
  conversation_id uuid NOT NULL REFERENCES mensageria.conversations(id) ON DELETE CASCADE,
  label_id        uuid NOT NULL REFERENCES mensageria.labels(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, label_id)
);

CREATE TABLE IF NOT EXISTS mensageria.canned_responses (   -- respostas rápidas /atalho
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  shortcut  text NOT NULL,
  content   text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS canned_tenant_shortcut ON mensageria.canned_responses (tenant_id, shortcut);

-- Trilha de auditoria da conversa (atribuições, mudança de status, etc.)
CREATE TABLE IF NOT EXISTS mensageria.conversation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES mensageria.conversations(id) ON DELETE CASCADE,
  event_type text NOT NULL,   -- assigned | status_changed | labeled | bot_handoff | note_added
  actor_id uuid,
  payload jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conv_events_conv ON mensageria.conversation_events (conversation_id, created_at);

-- ============================================================
-- 3. SLA (código chega em M3)
-- ============================================================

CREATE TABLE IF NOT EXISTS mensageria.sla_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  client_id uuid,
  name text NOT NULL,
  scope jsonb NOT NULL DEFAULT '{}',          -- { inbox_id?, team_id?, label_id?, segment_id? }
  first_response_target_min int,
  resolution_target_min int,
  business_hours jsonb,                       -- janela de expediente (pausa o relógio fora dela)
  is_active boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS mensageria.conversation_sla (
  conversation_id uuid PRIMARY KEY REFERENCES mensageria.conversations(id) ON DELETE CASCADE,
  policy_id uuid REFERENCES mensageria.sla_policies(id),
  first_response_due timestamptz,
  first_response_breached boolean DEFAULT false,
  resolution_due timestamptz,
  resolution_breached boolean DEFAULT false
);

-- ============================================================
-- 4. CHATBOT — flows, sessões, ferramentas por segmento (código chega em M4)
-- ============================================================

CREATE TABLE IF NOT EXISTS mensageria.bot_flows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  client_id uuid,
  name text NOT NULL,
  mode text NOT NULL DEFAULT 'llm',           -- 'llm' | 'rules'
  system_prompt text,                          -- override opcional; fallback é system_prompt_templates
  handoff_rules jsonb NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS mensageria.bot_sessions (
  conversation_id uuid PRIMARY KEY REFERENCES mensageria.conversations(id) ON DELETE CASCADE,
  flow_id uuid REFERENCES mensageria.bot_flows(id),
  state jsonb NOT NULL DEFAULT '{}',           -- slots + summary (memória rolante)
  active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Camada semântica dirigida por metadados (14.6-A) — flexibilidade total por segmento
CREATE TABLE IF NOT EXISTS mensageria.segment_data_entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id uuid,                            -- public.system_segments.id (null = global)
  tenant_id  uuid,                            -- null = vale p/ todos os tenants do segmento
  entity_name text NOT NULL,                  -- 'imovel' (nome lógico que o LLM vê)
  table_name  text NOT NULL,                  -- 'imoveis' (tabela física)
  description text,                           -- significado de negócio, p/ o LLM
  columns  jsonb NOT NULL,                     -- [{name,type,description,filterable,selectable}]
  relations jsonb NOT NULL DEFAULT '[]',      -- [{join_table, on, select, description}]
  tenant_column  text NOT NULL DEFAULT 'tenant_id',
  default_filter text DEFAULT 'ativo = true',
  max_rows int NOT NULL DEFAULT 5,
  is_active boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_segment_data_entities_segment ON mensageria.segment_data_entities (segment_id, is_active);

-- ============================================================
-- 5. RAG — base de conhecimento
-- ============================================================
-- ADIADO: requer extensão pgvector, ausente na imagem postgres:17-alpine atual.
-- Será uma migração própria (migration-YYYY-MM-DD-mensageria-rag.sql) quando a
-- imagem Postgres for trocada para uma que traga pgvector (fase M4/M5).
-- Tabelas a criar então: mensageria.knowledge_documents, mensageria.knowledge_chunks
-- (ver docs/PLANO_MENSAGERIA.md seção 14.6-B).

COMMIT;

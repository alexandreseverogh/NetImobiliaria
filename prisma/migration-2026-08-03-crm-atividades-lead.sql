-- ============================================================
-- CRM — Atividades por Lead
-- ============================================================
-- Feature: cada card do Kanban (lead) pode acumular N atividades
-- ao longo do ciclo de vendas/perda, escolhidas de um catálogo
-- padronizado (tipos_atividade, por tenant ou por cliente do
-- tenant) + complemento em texto livre. Suporta 1 anexo opcional
-- por atividade (áudio, imagem ou PDF), armazenado no mesmo
-- object storage (MinIO/S3) já usado pelo resto da plataforma.
--
-- Diferente de leads_kanban_ciclos (histórico automático de
-- movimentação de coluna, gravado por trigger) — atividade é
-- registro manual, mutável (editável/excluível pelo usuário).
-- ============================================================

-- Catálogo de tipos de atividade. client_id NULL = vale pra
-- empresa (tenant) toda; client_id preenchido = específico
-- daquele cliente do tenant, sobrepõe o catálogo do tenant na UI.
CREATE TABLE IF NOT EXISTS public.tipos_atividade (
  id          SERIAL PRIMARY KEY,
  tenant_id   UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id   UUID REFERENCES public.clientes(uuid) ON DELETE CASCADE,
  nome        VARCHAR(100) NOT NULL,
  icone       VARCHAR(50),
  cor         VARCHAR(7) DEFAULT '#3B82F6',
  ordem       INTEGER NOT NULL DEFAULT 0,
  ativo       BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- NULL não colide em UNIQUE padrão do Postgres — 2 índices parciais
-- garantem "nome" único dentro de cada escopo (tenant-wide vs. por cliente).
CREATE UNIQUE INDEX IF NOT EXISTS ux_tipos_atividade_tenant
  ON public.tipos_atividade(tenant_id, nome) WHERE client_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS ux_tipos_atividade_client
  ON public.tipos_atividade(tenant_id, client_id, nome) WHERE client_id IS NOT NULL;

-- Registros de atividade por lead. Mutável (edição/exclusão real
-- pelo usuário) — exclusão é soft-delete (deleted_at), nunca DELETE
-- físico, seguindo a convenção já usada no resto da plataforma
-- (reversível por padrão).
CREATE TABLE IF NOT EXISTS public.atividades_lead (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_uuid            UUID NOT NULL REFERENCES public.leads_staging(lead_uuid) ON DELETE CASCADE,
  tipo_atividade_id    INTEGER NOT NULL REFERENCES public.tipos_atividade(id) ON DELETE RESTRICT,
  descricao            TEXT NOT NULL,
  coluna_id            INTEGER REFERENCES public.kanban_colunas(id) ON DELETE SET NULL,
  usuario_id           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  anexo_url            TEXT,
  anexo_tipo           VARCHAR(10),      -- 'audio' | 'imagem' | 'pdf'
  anexo_nome_original  VARCHAR(255),
  anexo_tamanho_bytes  INTEGER,
  tenant_id            UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  client_id            UUID REFERENCES public.clientes(uuid) ON DELETE CASCADE,
  created_at           TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  deleted_at           TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_atividades_lead_lead
  ON public.atividades_lead(lead_uuid, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_atividades_lead_tenant
  ON public.atividades_lead(tenant_id, client_id);

DROP TRIGGER IF EXISTS update_tipos_atividade_updated_at ON public.tipos_atividade;
CREATE TRIGGER update_tipos_atividade_updated_at
  BEFORE UPDATE ON public.tipos_atividade
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_atividades_lead_updated_at ON public.atividades_lead;
CREATE TRIGGER update_atividades_lead_updated_at
  BEFORE UPDATE ON public.atividades_lead
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed: catálogo inicial por tenant (client_id NULL = tenant-wide),
-- pra cada tenant ativo que já usa o Kanban (tem ao menos 1 coluna
-- própria) — idempotente via ON CONFLICT DO NOTHING (os 2 índices
-- parciais acima já cobrem a checagem de duplicata).
INSERT INTO public.tipos_atividade (tenant_id, nome, icone, cor, ordem)
SELECT DISTINCT t.id, v.nome, v.icone, v.cor, v.ordem
FROM public.tenants t
JOIN public.kanban_colunas kc ON kc.tenant_id = t.id
CROSS JOIN (VALUES
  ('Ligação',              'PhoneIcon',          '#3B82F6', 1),
  ('WhatsApp',             'ChatBubbleLeftIcon',  '#22C55E', 2),
  ('E-mail',               'EnvelopeIcon',        '#6366F1', 3),
  ('Reunião',              'UsersIcon',           '#8B5CF6', 4),
  ('Proposta Enviada',     'DocumentTextIcon',    '#F59E0B', 5),
  ('Visita Realizada',     'HomeIcon',            '#EC4899', 6),
  ('Follow-up',            'ArrowPathIcon',       '#0EA5E9', 7),
  ('Negociação',           'ScaleIcon',           '#14B8A6', 8),
  ('Objeção Registrada',   'ExclamationTriangleIcon', '#EF4444', 9)
) AS v(nome, icone, cor, ordem)
ON CONFLICT DO NOTHING;

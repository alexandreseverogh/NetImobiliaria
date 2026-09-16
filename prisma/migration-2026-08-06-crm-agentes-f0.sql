-- F0 — Fundação dos Agentes de Aceleração do CRM (docs/PLANO_AGENTES_ACELERACAO_CRM.md §4).
--
-- Mesmo modelo de 2 camadas já usado e testado por crm_qualificacao_regras_segmento/_tenant:
-- config de segmento é curada pela Master, SEM tenant_id (sem "dono" — mesmo padrão de
-- system_benchmarks); override do tenant SEMPRE com tenant_id real e concreto (nunca sentinela
-- NULL). Nenhuma linha aqui referencia nenhum agente específico — o catálogo de agent_key
-- válidos vive em código (src/lib/crm/agents/index.ts) e cresce 1 fase por vez (F1-F5); F0
-- só entrega a fundação genérica, sem nenhum agente real registrado ainda.

CREATE TABLE public.crm_agentes_config_segmento (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id  uuid NOT NULL REFERENCES public.system_segments(id) ON DELETE CASCADE,
  agent_key   varchar(50) NOT NULL,
  ativo       boolean NOT NULL DEFAULT false,
  params      jsonb NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (segment_id, agent_key)
);

CREATE TABLE public.crm_agentes_config_tenant (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  agent_key   varchar(50) NOT NULL,
  ativo       boolean,               -- NULL = herda o "ativo" do segmento
  params      jsonb NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, agent_key)
);

-- Audit + fila de aprovação — mirror direto de campanhasmarketingdigital."AgentAction",
-- mesma taxonomia DEFENSIVE/OFFENSIVE, mesmo padrão de PIN+WhatsApp já em produção (Campanhas).
CREATE TABLE public.crm_agent_actions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  lead_uuid         uuid NOT NULL REFERENCES public.leads_staging(lead_uuid) ON DELETE CASCADE,
  agent_key         varchar(50) NOT NULL,
  type              varchar(10) NOT NULL,   -- DEFENSIVE | OFFENSIVE
  title             text NOT NULL,
  description       text NOT NULL,
  suggested_message text,
  confidence        double precision NOT NULL,
  status            varchar(20) NOT NULL DEFAULT 'NOTIFIED', -- NOTIFIED|PENDING_APPROVAL|EXECUTED|REJECTED
  approval_pin      varchar(6),
  approval_pin_exp  timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  executed_at       timestamptz
);
CREATE INDEX idx_crm_agent_actions_tenant_status ON public.crm_agent_actions(tenant_id, status);

-- T4 (docs/PLANO_TIKTOK.md §5.2/§8) — motor de realocação cross-rede.
--
-- AgentAction modela SEMPRE 1 campanha (campaignId/budget_before/budget_after singulares) —
-- suficiente pra PAUSE/DOWNSCALE/SCALE/ADD_NEGATIVE_KEYWORD, mas uma realocação envolve DUAS
-- campanhas (origem que perde verba, destino que ganha). Esta tabela carrega o detalhe
-- bilateral completo; a AgentAction vinculada (agent_action_id) é só o "anchor" de aprovação/
-- PIN/notificação — a mesma fila e o mesmo fluxo de PIN já usados por SCALE/REFRESH_CREATIVE.
CREATE TABLE campanhasmarketingdigital."BudgetReallocation" (
  id                    TEXT PRIMARY KEY,
  tenant_id             UUID NOT NULL,
  client_id             UUID NULL,
  segment_id            UUID NULL,

  -- origem (de onde sai a verba)
  source_campaign_id    TEXT NOT NULL,
  source_campaign_name  TEXT NOT NULL,
  source_network        VARCHAR(20) NOT NULL,
  source_cpl_before     NUMERIC(12,2) NOT NULL,
  source_budget_before  INTEGER NOT NULL,      -- centavos/dia, soma dos AdSets
  source_budget_after   INTEGER NULL,

  -- destino (para onde vai)
  target_campaign_id    TEXT NOT NULL,
  target_campaign_name  TEXT NOT NULL,
  target_network        VARCHAR(20) NOT NULL,
  target_cpl_before     NUMERIC(12,2) NOT NULL,
  target_budget_before  INTEGER NOT NULL,
  target_budget_after   INTEGER NULL,

  amount_cents          INTEGER NOT NULL,       -- valor diário realocado
  gap_pct               NUMERIC(6,2) NOT NULL,   -- vantagem de CPL origem→destino, no momento da proposta
  projected_lead_gain   NUMERIC(10,3) NOT NULL,  -- ganho líquido diário estimado (já com haircut marginal)
  confidence            NUMERIC(4,3) NOT NULL,

  status                VARCHAR(20) NOT NULL DEFAULT 'PROPOSED',
                        -- PROPOSED | APPROVED | REJECTED | EXECUTED | REVERTED | MEASURED
  agent_action_id       TEXT NULL,

  -- medição pós-fato (preenchida por cron D+14)
  measured_at           TIMESTAMPTZ NULL,
  actual_lead_gain      NUMERIC(10,3) NULL,
  verdict               VARCHAR(20) NULL,        -- CONFIRMED | NEUTRAL | BACKFIRED

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  executed_at           TIMESTAMPTZ NULL
);

CREATE INDEX idx_realloc_tenant    ON campanhasmarketingdigital."BudgetReallocation" (tenant_id, created_at DESC);
CREATE INDEX idx_realloc_pair      ON campanhasmarketingdigital."BudgetReallocation" (source_campaign_id, target_campaign_id, created_at DESC);
CREATE INDEX idx_realloc_pending   ON campanhasmarketingdigital."BudgetReallocation" (status) WHERE status IN ('PROPOSED','APPROVED');
CREATE INDEX idx_realloc_measuring ON campanhasmarketingdigital."BudgetReallocation" (status, executed_at) WHERE status = 'EXECUTED';
CREATE INDEX idx_realloc_agent_action ON campanhasmarketingdigital."BudgetReallocation" (agent_action_id);

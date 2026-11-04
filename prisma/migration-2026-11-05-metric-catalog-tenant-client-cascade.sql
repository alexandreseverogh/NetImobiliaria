-- Catálogo de Métricas Dinâmico — Cascata Segmento → Tenant → Cliente
-- Ver docs/CHECKPOINT.md (plano "typed-percolating-riddle") pro desenho completo.
--
-- Mesma técnica já usada em campanhasmarketingdigital."Settings" (cascata Cliente→Tenant→
-- Segmento→Global de LLM) e public.system_prompt_templates (cascata de prompt): colunas
-- nullable + índices únicos parciais, cada um com WHERE mutuamente exclusivo — a MESMA tabela
-- carrega o default do Master (segment_id preenchido), o override de tenant (tenant_id
-- preenchido, client_id NULL) e o override de cliente (tenant_id+client_id preenchidos), sem
-- nunca colidir entre si.
--
-- As 19 linhas reais já curadas (todas segment_id preenchido, tenant_id/client_id NULL por
-- default de coluna nova) continuam válidas sem nenhuma migração de dado — só satisfazem o
-- CHECK novo automaticamente.

ALTER TABLE campanhasmarketingdigital.segment_metric_catalog
  DROP CONSTRAINT segment_metric_catalog_segment_id_metric_key_key,
  ALTER COLUMN segment_id DROP NOT NULL,
  ADD COLUMN tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  ADD COLUMN client_id UUID REFERENCES public.clientes(uuid) ON DELETE CASCADE;

ALTER TABLE campanhasmarketingdigital.segment_metric_catalog
  ADD CONSTRAINT chk_smc_exactly_one_scope CHECK (
    (segment_id IS NOT NULL AND tenant_id IS NULL AND client_id IS NULL) OR  -- padrão do Master
    (segment_id IS NULL AND tenant_id IS NOT NULL AND client_id IS NULL) OR  -- override do tenant
    (segment_id IS NULL AND tenant_id IS NOT NULL AND client_id IS NOT NULL) -- override do cliente
  );

-- ON CONFLICT escrito contra qualquer um destes 3 índices precisa copiar o WHERE exato, char a
-- char — Postgres rejeita o arbiter senão (achado real, já documentado 2x no histórico deste
-- projeto, cascatas de LLM e de Prompt).
CREATE UNIQUE INDEX IF NOT EXISTS idx_smc_segment_unique
  ON campanhasmarketingdigital.segment_metric_catalog (segment_id, metric_key)
  WHERE segment_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_smc_tenant_unique
  ON campanhasmarketingdigital.segment_metric_catalog (tenant_id, metric_key)
  WHERE tenant_id IS NOT NULL AND client_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_smc_client_unique
  ON campanhasmarketingdigital.segment_metric_catalog (tenant_id, client_id, metric_key)
  WHERE client_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_smc_tenant_lookup
  ON campanhasmarketingdigital.segment_metric_catalog (tenant_id, client_id, is_active);

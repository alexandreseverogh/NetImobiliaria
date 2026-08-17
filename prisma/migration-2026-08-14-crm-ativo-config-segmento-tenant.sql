-- CRM: config do "ativo" vinculado a um lead (Vínculo Exato + Enriquecimento) deixa de ser
-- global (crm_segmentos_config, 1 linha, domain_id=1 cravado em 3 call sites diferentes) e
-- passa a seguir o mesmo padrão já usado por Agentes de Aceleração/Critérios de Fit/
-- Qualificação de Lead: padrão curado pelo Master por segmento + override opcional por tenant.
--
-- Achado real ao investigar: crm_segmentos_config nunca teve nenhuma checagem de auth real
-- (unifiedPermissionMiddleware é fail-open pra rota nunca registrada em
-- route_permissions_config) e target_table/target_fk_column eram interpolados direto em SQL
-- sem validação (EnrichmentService.enrichLead) — SQL injection sem autenticação, ativa até
-- esta correção. Fechado via requireApiPermission + validação de identificador nas rotas novas.

CREATE TABLE public.crm_ativo_config_segmento (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id          UUID NOT NULL UNIQUE REFERENCES public.system_segments(id) ON DELETE CASCADE,
  target_table        VARCHAR(100) NOT NULL,
  target_fk_column    VARCHAR(100) NOT NULL DEFAULT 'imovel_id',
  target_name_column  VARCHAR(100) NOT NULL,
  target_label        VARCHAR(100) NOT NULL,
  layout_json         JSONB NOT NULL DEFAULT '{}'::jsonb,
  form_schema_json    JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.crm_ativo_config_tenant (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  target_table        VARCHAR(100) NOT NULL,
  target_fk_column    VARCHAR(100) NOT NULL DEFAULT 'imovel_id',
  target_name_column  VARCHAR(100) NOT NULL,
  target_label        VARCHAR(100) NOT NULL,
  layout_json         JSONB NOT NULL DEFAULT '{}'::jsonb,
  form_schema_json    JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backfill: a única config real que já existia (domain_id=1, Imobiliário) migra intacta pro
-- padrão do segmento — zero regressão de comportamento pros tenants Imobiliário existentes.
INSERT INTO public.crm_ativo_config_segmento
  (segment_id, target_table, target_fk_column, target_name_column, target_label, layout_json, form_schema_json, is_active)
SELECT
  ss.id,
  csc.target_table,
  csc.target_fk_column,
  'titulo',
  'Imóvel',
  csc.layout_json,
  csc.form_schema_json,
  csc.is_active
FROM public.crm_segmentos_config csc
JOIN public.system_segments ss ON ss.slug = 'imobiliaria'
WHERE csc.domain_id = 1;

DROP TABLE public.crm_segmentos_config;

-- Cascata Client -> Tenant -> Segmento(Master) -> Global(Master) para MODELO DE LLM e PROMPTS,
-- restrita a CRM + Mensageria (Campanhas de Marketing Digital continua com modelo único e
-- global do Master, de propósito — getLlmClientForCampaigns/invokeForContext intocados).
-- Como cliente nunca loga na aplicação, quem cadastra o override de um cliente é sempre o
-- admin do tenant, em nome dele.
--
-- Antes: Settings (modelo de LLM) só tinha 2 níveis — tenant_id / global (tenant_id IS NULL,
-- 1 única linha pra toda a plataforma, sem distinção de segmento). system_prompt_templates
-- (texto do prompt) só tinha 2 níveis — segment_id / global. Nenhum dos dois tinha noção de
-- cliente; nenhum tinha edição por tenant em lugar nenhum da UI.

-- =====================================================================================
-- 1. campanhasmarketingdigital."Settings" — adiciona client_id (override por cliente) e
--    segment_id (default do Master POR SEGMENTO — a linha global de hoje, tenant_id IS NULL
--    AND segment_id IS NULL, continua existindo como fallback final quando um segmento ainda
--    não tem default próprio configurado).
-- =====================================================================================

ALTER TABLE campanhasmarketingdigital."Settings"
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clientes(uuid),
  ADD COLUMN IF NOT EXISTS segment_id UUID REFERENCES public.system_segments(id);

-- Substitui o UNIQUE(tenant_id) simples por 3 índices únicos parciais — mesmo idioma já
-- usado em system_prompt_templates para segment_id (linha de segmento vs. linha global).
ALTER TABLE campanhasmarketingdigital."Settings" DROP CONSTRAINT IF EXISTS "Settings_tenantId_key";

CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_tenant_own
  ON campanhasmarketingdigital."Settings" (tenant_id)
  WHERE tenant_id IS NOT NULL AND client_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_tenant_client
  ON campanhasmarketingdigital."Settings" (tenant_id, client_id)
  WHERE client_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_settings_segment_default
  ON campanhasmarketingdigital."Settings" (segment_id)
  WHERE tenant_id IS NULL AND segment_id IS NOT NULL;

-- =====================================================================================
-- 2. public.system_prompt_templates — adiciona tenant_id (override por tenant) e client_id
--    (override por cliente), como camadas ADICIONAIS à cascata segmento/global já existente.
-- =====================================================================================

ALTER TABLE public.system_prompt_templates
  ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id),
  ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.clientes(uuid);

CREATE UNIQUE INDEX IF NOT EXISTS idx_prompt_templates_client_unique
  ON public.system_prompt_templates (client_id, template_key, version)
  WHERE client_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_prompt_templates_tenant_unique
  ON public.system_prompt_templates (tenant_id, template_key, version)
  WHERE tenant_id IS NOT NULL AND client_id IS NULL;

-- Índice de leitura (cascata sempre resolve por template_key + tenant/client) — espelha o
-- idx_prompt_templates_key_segment já existente.
CREATE INDEX IF NOT EXISTS idx_prompt_templates_key_tenant
  ON public.system_prompt_templates (template_key, tenant_id, client_id);

-- Achado real testando ao vivo: o índice global PRÉ-EXISTENTE (WHERE segment_id IS NULL)
-- também capturava as novas linhas de tenant/client (que têm segment_id NULL por serem um
-- eixo ortogonal), colidindo com a linha global de verdade num PUT de override. Redefinido
-- pra só valer pra tenant_id IS NULL — a linha global genuína.
DROP INDEX IF EXISTS idx_prompt_templates_global_unique;
CREATE UNIQUE INDEX idx_prompt_templates_global_unique
  ON public.system_prompt_templates (template_key, version)
  WHERE segment_id IS NULL AND tenant_id IS NULL;

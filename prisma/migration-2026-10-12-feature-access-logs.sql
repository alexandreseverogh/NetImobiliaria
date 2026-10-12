-- Log de acesso a funcionalidade (navegação de página), por administrador de tenant.
-- Granularidade: 1 registro por tela visitada (não por chamada de API) — decisão do usuário
-- em 2026-10-12, pra manter o volume controlado.
--
-- feature_name/feature_slug são snapshot do nome/slug no momento do acesso (não FK pura pro
-- nome atual) — se o Master renomear a feature depois, o histórico continua legível com o
-- nome que ela tinha quando foi acessada.

CREATE TABLE IF NOT EXISTS public.feature_access_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  feature_id INTEGER REFERENCES public.system_features(id) ON DELETE SET NULL,
  feature_name VARCHAR(255),
  feature_slug VARCHAR(100),
  route VARCHAR(500) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  accessed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feature_access_logs_tenant_date
  ON public.feature_access_logs (tenant_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_feature_access_logs_user
  ON public.feature_access_logs (user_id, accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_feature_access_logs_feature
  ON public.feature_access_logs (feature_id);

CREATE INDEX IF NOT EXISTS idx_feature_access_logs_accessed_at
  ON public.feature_access_logs (accessed_at DESC);

-- Tabela de arquivo p/ expurgo (mesmo padrão já usado em login_logs -> login_logs_purged).
-- Estrutura idêntica + a data em que o expurgo aconteceu.
CREATE TABLE IF NOT EXISTS public.feature_access_logs_purged (
  LIKE public.feature_access_logs
);

ALTER TABLE public.feature_access_logs_purged
  ADD COLUMN IF NOT EXISTS purged_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Feature "Administradores das Empresas" (id=79) já existe sob a categoria 22
-- (Master Governance), em /admin/master/usuarios. A nova aba de log de acesso vive
-- dentro dessa mesma página (sem feature/rota nova) — nenhum INSERT em system_features
-- é necessário aqui.

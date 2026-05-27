-- Migration 213: Isolamento Final e Branding Multi-Tenant
-- Objetivo: Finalizar a separação de logs/analytics e permitir personalização visual por tenant.

BEGIN;

-- 1. Identidade Visual em Tenants
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS primary_color CHARACTER VARYING(7) DEFAULT '#1A2B3C';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS secondary_color CHARACTER VARYING(7) DEFAULT '#F1F1F1';


-- 2. Isolamento de Analytics (Pageviews)
ALTER TABLE analytics_pageviews ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Atualizar tenant_id baseado no imóvel visualizado
UPDATE analytics_pageviews ap
SET tenant_id = i.tenant_id
FROM imoveis i
WHERE ap.imovel_id = i.id AND i.tenant_id IS NOT NULL;

-- Para registros sem imóvel (home, listagem global), atribuir ao tenant padrão
UPDATE analytics_pageviews SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_analytics_pageviews_tenant ON analytics_pageviews(tenant_id);


-- 3. Isolamento de Logs de 2FA
ALTER TABLE audit_2fa_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Tentar herdar tenant_id do usuário
UPDATE audit_2fa_logs al
SET tenant_id = utm.tenant_id
FROM user_tenant_membership utm
WHERE al.user_id = utm.user_id AND al.tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_audit_2fa_logs_tenant ON audit_2fa_logs(tenant_id);


-- 4. Isolamento de Logs de E-mail
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_email_logs_tenant ON email_logs(tenant_id);

COMMIT;

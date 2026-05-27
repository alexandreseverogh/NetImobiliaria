-- Migration 210: Isolamento de Tenant em Usuários e Permissões
-- Objetivo: Garantir que associações de perfis e permissões tenham o campo tenant_id para isolamento total.

BEGIN;

-- 1. Tabela user_role_assignments
ALTER TABLE user_role_assignments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Atualizar tenant_id baseado no tenant_id do perfil (role)
UPDATE user_role_assignments ura
SET tenant_id = ur.tenant_id
FROM user_roles ur
WHERE ura.role_id = ur.id AND ur.tenant_id IS NOT NULL;

-- Para registros sem tenant (globais), podemos deixar NULL ou atribuir o tenant padrão
-- Se ur.tenant_id for NULL (perfil de sistema), deixamos NULL no assignment também (acesso global)

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_tenant ON user_role_assignments(tenant_id);


-- 2. Tabela role_permissions
ALTER TABLE role_permissions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Atualizar tenant_id baseado no tenant_id do perfil
UPDATE role_permissions rp
SET tenant_id = ur.tenant_id
FROM user_roles ur
WHERE rp.role_id = ur.id AND ur.tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_role_permissions_tenant ON role_permissions(tenant_id);


-- 3. Tabela role_custom_fields
ALTER TABLE role_custom_fields ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- Atualizar tenant_id baseado no tenant_id do perfil
UPDATE role_custom_fields rcf
SET tenant_id = ur.tenant_id
FROM user_roles ur
WHERE rcf.role_id = ur.id AND ur.tenant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_role_custom_fields_tenant ON role_custom_fields(tenant_id);

COMMIT;

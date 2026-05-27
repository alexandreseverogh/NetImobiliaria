-- ====================================================================
-- PILLAR 2: IAM & Multi-tenancy
-- 001_create_iam_structure.sql
-- Descrição: Criação das tabelas de Tenants e Memberships para suporte
--            a múltiplas empresas e isolamento de dados.
-- ====================================================================

-- 1. Extensão para UUID (Se não existir)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Tabela de Tenants (Empresas)
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    cnpj_cpf VARCHAR(20) UNIQUE,
    segment VARCHAR(50) DEFAULT 'imoveis',
    status VARCHAR(20) DEFAULT 'active', -- active, suspended, inactive
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de Memberships (Vínculo Usuário-Empresa)
CREATE TABLE IF NOT EXISTS user_tenant_membership (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    role_id INTEGER REFERENCES user_roles(id),
    is_active BOOLEAN DEFAULT TRUE,
    is_owner BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_access TIMESTAMP WITH TIME ZONE,
    UNIQUE(user_id, tenant_id)
);

-- 4. Criação do Tenant Padrão (Compatibilidade Legada)
-- Usamos um ID fixo para facilitar o mapeamento inicial de todos os usuários.
INSERT INTO tenants (id, name, slug, segment, status) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Net Imobiliária (Alpha)', 'net-imobiliaria', 'imoveis', 'active')
ON CONFLICT DO NOTHING;

-- 5. Migração Automática: Vincula todos os usuários atuais ao Tenant Alpha
-- Isso garante que ninguém perca o acesso após a atualização do schema.
INSERT INTO user_tenant_membership (user_id, tenant_id, role_id, is_active, is_owner)
SELECT id, '00000000-0000-0000-0000-000000000001', 1, ativo, TRUE FROM users
ON CONFLICT DO NOTHING;

-- Módulos Globais do Sistema
CREATE TABLE IF NOT EXISTS system_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Atribuição de Módulos para Empresas (Tenants)
CREATE TABLE IF NOT EXISTS tenant_modules (
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    module_id UUID REFERENCES system_modules(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (tenant_id, module_id)
);

-- Vincular categorias existentes aos módulos (opcional, mas recomendado para bloqueio automático)
ALTER TABLE system_categorias ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES system_modules(id);

-- Inserir Módulos Iniciais
INSERT INTO system_modules (name, slug, description, icon) VALUES 
('Administrativo', 'admin', 'Módulo base de gestão administrativa e configurações de sistema', 'cog'),
('CRM de Vendas', 'crm', 'Gestão de funil de vendas, imóveis, clientes e proprietários', 'users'),
('Landpaging (Mídia)', 'landpaging', 'Gestão de landing pages, captura de leads e central de marketing', 'megaphone')
ON CONFLICT (slug) DO NOTHING;

-- Vincular categorias existentes aos novos módulos
UPDATE system_categorias SET module_id = (SELECT id FROM system_modules WHERE slug = 'admin') 
WHERE slug IN ('sistema', 'permissoes', 'administrativo', 'parametros');

UPDATE system_categorias SET module_id = (SELECT id FROM system_modules WHERE slug = 'crm') 
WHERE slug IN ('crm', 'imoveis', 'clientes', 'proprietarios', 'dashboard-relatorios');

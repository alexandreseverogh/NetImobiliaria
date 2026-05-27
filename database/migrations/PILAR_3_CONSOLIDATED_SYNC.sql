-- ==============================================================================
-- PILAR 3 CONSOLIDATED SYNC - Versão 3.6 (FINAL GOVERNANÇA MASTER)
-- Data: 2026-04-10
-- Objetivo: Sincronização de tabelas de Segmentos, Overrides e Sidebar Relacional
-- ==============================================================================

BEGIN;

-- 1. ESTRUTURA DE SEGMENTOS (NICHO DE MERCADO)
CREATE TABLE IF NOT EXISTS public.system_segments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    color_theme VARCHAR(50) DEFAULT '#2563eb',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. DADOS INICIAIS DE SEGMENTOS (TEMAS DINÂMICOS)
INSERT INTO public.system_segments (name, slug, description, icon, color_theme) VALUES 
('Imobiliário', 'imobiliaria', 'Gestão de imóveis, leads e corretores', 'home', '#2563eb'),
('Saúde Digital', 'saude', 'Prontuários e gestão de clínicas', 'activity', '#10b981'),
('Master Platform', 'master', 'Controle supremo da infraestrutura', 'shield', '#1e293b'),
('Geral', 'geral', 'Segmento padrão para novos negócios', 'box', '#4f46e5')
ON CONFLICT (slug) DO UPDATE SET color_theme = EXCLUDED.color_theme, icon = EXCLUDED.icon;

-- 3. EVOLUÇÃO DA TABELA DE TENANTS (EMPRESAS)
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS segment_id UUID REFERENCES public.system_segments(id);

-- Migração de dados legados (Texto para ID)
UPDATE public.tenants t 
SET segment_id = s.id 
FROM public.system_segments s 
WHERE t.segment = s.slug;

CREATE INDEX IF NOT EXISTS idx_tenants_segment_id ON public.tenants(segment_id);

-- 4. EVOLUÇÃO DA TABELA DE BLUEPRINTS (FUNCIONALIDADES PADRÃO)
ALTER TABLE public.system_segment_blueprints ADD COLUMN IF NOT EXISTS segment_id UUID REFERENCES public.system_segments(id);

UPDATE public.system_segment_blueprints b
SET segment_id = s.id
FROM public.system_segments s
WHERE b.segment = s.slug;

ALTER TABLE public.system_segment_blueprints DROP COLUMN IF EXISTS segment;

-- 5. TABELA DE OVERRIDES (CUSTOMIZAÇÃO POR EMPRESA)
DROP TABLE IF EXISTS public.tenant_feature_overrides CASCADE;
CREATE TABLE public.tenant_feature_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    feature_id INTEGER NOT NULL REFERENCES public.system_features(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, feature_id)
);

-- 6. FUNÇÃO MASTER DA SIDEBAR (V3.6)
CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(p_user_id UUID, p_tenant_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_role_level INTEGER;
    v_menu JSONB;
BEGIN
    -- 1. Obter nível de acesso do usuário neste tenant (via membership)
    SELECT ur.level INTO v_role_level
    FROM user_tenant_membership utm
    JOIN user_roles ur ON utm.role_id = ur.id
    WHERE utm.user_id = p_user_id AND utm.tenant_id = p_tenant_id AND utm.is_active = true
    ORDER BY ur.level DESC LIMIT 1;

    -- Fallback Master se não houver membership específico
    IF v_role_level IS NULL THEN
        SELECT ur.level INTO v_role_level
        FROM user_role_assignments ura
        JOIN user_roles ur ON ura.role_id = ur.id
        WHERE ura.user_id = p_user_id
        ORDER BY ur.level DESC LIMIT 1;
    END IF;

    -- 2. Construir o menu baseado em Permissões + Blueprints do Segmento + Overrides do Tenant
    WITH feature_access AS (
        SELECT 
            f.id, f.name, f.slug, f.category_id,
            COALESCE(o.is_active, b.is_active, false) as current_status
        FROM system_features f
        JOIN tenants t ON t.id = p_tenant_id
        LEFT JOIN system_segment_blueprints b ON f.id = b.feature_id AND b.segment_id = t.segment_id
        LEFT JOIN tenant_feature_overrides o ON f.id = o.feature_id AND o.tenant_id = t.id
        WHERE v_role_level >= 1
    )
    SELECT jsonb_agg(cat_menu) INTO v_menu
    FROM (
        SELECT 
            jsonb_build_object(
                'category', c.name,
                'icon', c.icon,
                'items', jsonb_agg(
                    jsonb_build_object(
                        'name', f.name,
                        'slug', f.slug
                    )
                )
            ) as cat_menu
        FROM system_categorias c
        JOIN feature_access f ON f.category_id = c.id
        WHERE f.current_status = true
        GROUP BY c.id, c.name, c.icon
        ORDER BY c.id
    ) sub;

    RETURN COALESCE(v_menu, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================================
-- REESTRUTURAÇÃO HOLÍSTICA: HIERARQUIA DE FERRO
-- ============================================================
-- 1. Criação da tabela pivô entre Segmentos e Módulos (N:N)
-- 2. Migração automática dos Blueprints atuais
-- ============================================================

-- [1] Criar tabela de ligação Segmento <-> Módulo
CREATE TABLE IF NOT EXISTS public.system_segment_modules (
    segment_id UUID NOT NULL REFERENCES public.system_segments(id) ON DELETE CASCADE,
    module_id UUID NOT NULL REFERENCES public.system_modules(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (segment_id, module_id)
);

-- [2] Migração Inteligente: Vincular Módulos aos Segmentos baseada nos Blueprints atuais
-- Se um segmento tem uma funcionalidade em seu blueprint, e essa funcionalidade 
-- pertence a um módulo, então o segmento deve ter esse módulo habilitado.
INSERT INTO public.system_segment_modules (segment_id, module_id)
SELECT DISTINCT b.segment_id, fm.module_id
FROM public.system_segment_blueprints b
JOIN public.system_feature_modules fm ON b.feature_id = fm.feature_id
ON CONFLICT DO NOTHING;

-- [3] Garantia Master: Vincular o módulo 'Master' ao segmento 'Master' explicitly
-- Buscando IDs pelos slugs para garantir precisão
DO $$
DECLARE
    v_master_segment_id UUID;
    v_master_module_id UUID;
BEGIN
    SELECT id INTO v_master_segment_id FROM public.system_segments WHERE slug = 'master';
    SELECT id INTO v_master_module_id FROM public.system_modules WHERE slug = 'master';

    IF v_master_segment_id IS NOT NULL AND v_master_module_id IS NOT NULL THEN
        INSERT INTO public.system_segment_modules (segment_id, module_id)
        VALUES (v_master_segment_id, v_master_module_id)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- [4] Comentários da Auditoria
COMMENT ON TABLE public.system_segment_modules IS 'Tabela core que define quais módulos estão disponíveis para cada segmento de negócio.';

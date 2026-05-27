-- MIGRATION: CRM_AGNOSTICO_ENRICHMENT_V1
-- Objetivo: Infraestrutura para motor de enriquecimento agnóstico

SET client_encoding = 'UTF8';

BEGIN;

-- 1. Adicionar coluna de cache no leads_staging
-- Incremental: Apenas adiciona a coluna se não existir
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='leads_staging' AND column_name='enriquecimento_cache') THEN
        ALTER TABLE leads_staging ADD COLUMN enriquecimento_cache JSONB;
    END IF;
END $$;

-- 2. Garantir que a tabela crm_segmentos_config tenha um template inicial para Imóveis (domain_id = 1)
-- IMPORTANTE: Se já existir um, mantemos o existente para evitar sobreposição (incremental)
INSERT INTO crm_segmentos_config (domain_id, target_table, target_fk_column, layout_json, is_active, updated_at)
VALUES (
    1, 
    'imoveis', 
    'imovel_id', 
    '{
        "title_template": "Imóvel: {{codigo_imovel}}",
        "subtitle_template": "{{tipo_imovel}} em {{bairro}}",
        "badges": [
            {"label": "Dorms", "campo": "quartos", "icone": "bed"},
            {"label": "Suítes", "campo": "suites", "icone": "bath"},
            {"label": "Vagas", "campo": "vagas", "icone": "car-front"},
            {"label": "Área", "campo": "area_total", "icone": "maximize", "sufixo": "m²"},
            {"label": "Valor", "campo": "preco", "icone": "dollar-sign", "prefixo": "R$ "}
        ]
    }'::jsonb,
    true,
    NOW()
)
ON CONFLICT (domain_id) DO NOTHING;

COMMIT;

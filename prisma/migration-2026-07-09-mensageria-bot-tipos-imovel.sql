-- ============================================================
-- Migration 2026-07-09: Mensageria — 2ª ferramenta de dados do bot (tipos de imóvel)
--
-- Motivada por teste real: o bot respondeu genericamente "que tipos de imóveis vocês
-- trabalham?" (inventou casas/apartamentos/terrenos) porque não tinha ferramenta
-- nenhuma sobre tipos_imovel — só existia a entidade `imovel`. Agora que a tabela tem
-- escopo real por tenant (ver migration-2026-07-09-tipos-status-imovel-tenant-scope.sql),
-- registra a entidade pro segmento Imobiliário — mesmo padrão de `imovel`.
-- Idempotente.
-- ============================================================

BEGIN;

INSERT INTO mensageria.segment_data_entities (
  segment_id, tenant_id, entity_name, table_name, description, columns, relations,
  tenant_column, default_filter, max_rows, is_active
)
SELECT
  ss.id, NULL, 'tipo_imovel', 'tipos_imovel',
  'Tipos de imóvel que a empresa trabalha (Casa, Apartamento, Terreno, etc.) — use para responder o que a empresa oferece.',
  '[
    {"name":"nome","type":"text","description":"Nome do tipo de imóvel","selectable":true,"filterable":true},
    {"name":"descricao","type":"text","description":"Descrição do tipo","selectable":true,"filterable":false}
  ]'::jsonb,
  '[]'::jsonb,
  'tenant_id', 'ativo = true', 20, true
FROM public.system_segments ss
WHERE ss.slug = 'imobiliaria'
  AND NOT EXISTS (
    SELECT 1 FROM mensageria.segment_data_entities sde
     WHERE sde.segment_id = ss.id AND sde.entity_name = 'tipo_imovel' AND sde.tenant_id IS NULL
  );

COMMIT;

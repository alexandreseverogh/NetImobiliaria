-- ============================================================
-- Migration 2026-07-08: Mensageria M4.2 refinamento — relations da entidade imóvel
-- Ver docs/PLANO_MENSAGERIA.md seção 14.6-A + seção 18 (motor multi-tabela)
--
-- A entidade `imovel` foi semeada em migration-2026-07-08-mensageria-bot-persona.sql
-- com `relations: []`. Esta migração popula as relations reais para o bot alcançar as
-- tabelas correlacionadas (fotos, amenidades, proximidades) via o resolver genérico —
-- subqueries escalares correlacionadas com agregação one-to-many e multi-hop.
-- Idempotente: um UPDATE do JSONB relations (pode rodar de novo sem efeito colateral).
-- ============================================================

BEGIN;

UPDATE mensageria.segment_data_entities
SET relations = '[
  {
    "name": "qtd_fotos",
    "description": "Quantidade de fotos do imóvel",
    "bridge_table": "imovel_imagens",
    "bridge_fk": "imovel_id",
    "select_column": "id",
    "agg": "count"
  },
  {
    "name": "amenidades",
    "description": "Lista de amenidades/comodidades do imóvel",
    "bridge_table": "imovel_amenidades",
    "bridge_fk": "imovel_id",
    "lookup_table": "amenidades",
    "lookup_fk": "amenidade_id",
    "select_column": "nome",
    "agg": "array"
  },
  {
    "name": "proximidades",
    "description": "Pontos de interesse próximos ao imóvel",
    "bridge_table": "imovel_proximidades",
    "bridge_fk": "imovel_id",
    "lookup_table": "proximidades",
    "lookup_fk": "proximidade_id",
    "select_column": "nome",
    "agg": "array"
  }
]'::jsonb
WHERE entity_name = 'imovel'
  AND table_name = 'imoveis'
  AND tenant_id IS NULL
  AND segment_id = (SELECT id FROM public.system_segments WHERE slug = 'imobiliaria');

COMMIT;

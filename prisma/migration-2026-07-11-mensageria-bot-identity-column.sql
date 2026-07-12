-- Fecha a última suposição não-configurável do mecanismo de cartões: botAdapter.ts casava
-- linha↔item sempre por "row.id" (nome fixo). Agora cada entidade declara sua própria coluna de
-- identidade (default 'id', preserva comportamento atual pra todas as entidades existentes) —
-- mesmo padrão já usado em EntityRelation.base_pk (default 'id', mas configurável por linha).

ALTER TABLE mensageria.segment_data_entities
  ADD COLUMN IF NOT EXISTS identity_column VARCHAR(63) NOT NULL DEFAULT 'id';

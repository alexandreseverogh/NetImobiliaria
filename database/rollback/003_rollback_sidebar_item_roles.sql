-- ============================================================
-- ROLLBACK 003: Remover tabela sidebar_item_roles
-- ============================================================

DROP TABLE IF EXISTS sidebar_item_roles CASCADE;

SELECT 'Tabela sidebar_item_roles removida' as status;




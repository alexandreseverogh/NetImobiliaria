-- ============================================================
-- MIGRATION 015: Corrigir WRITE nas rotas (VERSÃO 2 - COMPLETA)
-- ============================================================

BEGIN;

-- Remover constraint
ALTER TABLE route_permissions_config DROP CONSTRAINT IF EXISTS valid_action;

-- Corrigir rotas GET com /novo (páginas de criação) → CREATE
UPDATE route_permissions_config
SET default_action = 'CREATE'
WHERE method = 'GET' 
  AND route_pattern LIKE '%/novo'
  AND default_action = 'WRITE';

-- Corrigir rotas GET com /editar (páginas de edição) → UPDATE
UPDATE route_permissions_config
SET default_action = 'UPDATE'
WHERE method = 'GET' 
  AND route_pattern LIKE '%/editar'
  AND default_action = 'WRITE';

-- Corrigir rotas POST (criar) → CREATE
UPDATE route_permissions_config
SET default_action = 'CREATE'
WHERE method = 'POST' 
  AND default_action = 'WRITE';

-- Corrigir rotas PUT (editar) → UPDATE
UPDATE route_permissions_config
SET default_action = 'UPDATE'
WHERE method = 'PUT' 
  AND default_action = 'WRITE';

-- Recriar constraint SEM WRITE
ALTER TABLE route_permissions_config 
ADD CONSTRAINT valid_action 
CHECK (default_action IN ('CREATE', 'READ', 'UPDATE', 'DELETE', 'EXECUTE', 'ADMIN'));

-- Verificar
SELECT COUNT(*) as rotas_com_write
FROM route_permissions_config
WHERE default_action = 'WRITE';

COMMIT;




-- ============================================================
-- MIGRATION 015: Corrigir WRITE nas rotas
-- ============================================================
-- Elimina 100% das ocorrências de 'WRITE' em route_permissions_config
-- Substitui por CREATE (POST) ou UPDATE (PUT/PATCH)
-- ============================================================

BEGIN;

\echo '🔧 MIGRATION 015: Eliminando WRITE de route_permissions_config...'

-- ============================================================
-- PASSO 1: Remover constraint temporariamente
-- ============================================================
ALTER TABLE route_permissions_config 
DROP CONSTRAINT IF EXISTS valid_action;

\echo '✅ Constraint removida temporariamente'

-- ============================================================
-- PASSO 2: Atualizar rotas POST (criar) → CREATE
-- ============================================================
UPDATE route_permissions_config
SET default_action = 'CREATE'
WHERE method = 'POST' 
  AND default_action = 'WRITE';

\echo '✅ Rotas POST atualizadas para CREATE'

-- ============================================================
-- PASSO 3: Atualizar rotas PUT/PATCH (editar) → UPDATE
-- ============================================================
UPDATE route_permissions_config
SET default_action = 'UPDATE'
WHERE method IN ('PUT', 'PATCH') 
  AND default_action = 'WRITE';

\echo '✅ Rotas PUT/PATCH atualizadas para UPDATE'

-- ============================================================
-- PASSO 4: Verificar se ainda existe WRITE
-- ============================================================
DO $$
DECLARE
    write_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO write_count
    FROM route_permissions_config
    WHERE default_action = 'WRITE';
    
    IF write_count > 0 THEN
        RAISE EXCEPTION 'Ainda existem rotas com WRITE: %', write_count;
    ELSE
        RAISE NOTICE 'Nenhuma rota com WRITE encontrada!';
    END IF;
END $$;

-- ============================================================
-- PASSO 5: Recriar constraint SEM WRITE
-- ============================================================
ALTER TABLE route_permissions_config 
ADD CONSTRAINT valid_action 
CHECK (default_action IN ('CREATE', 'READ', 'UPDATE', 'DELETE', 'EXECUTE', 'ADMIN'));

\echo '✅ Constraint atualizada (WRITE removido da lista válida)'

-- ============================================================
-- Relatório final
-- ============================================================
\echo ''
\echo '📊 Distribuição de ações nas rotas:'
SELECT 
    default_action,
    method,
    COUNT(*) as qtd_rotas
FROM route_permissions_config
GROUP BY default_action, method
ORDER BY default_action, method;

COMMIT;

\echo ''
\echo '✅ MIGRATION 015 CONCLUÍDA COM SUCESSO!'


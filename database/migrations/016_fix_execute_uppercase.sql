-- ============================================================
-- MIGRATION 016: Corrigir EXECUTE em maiúsculas
-- ============================================================
-- Problema: 1 permissão com action='EXECUTE' (maiúsculas)
-- Solução: Padronizar para 'execute' (minúsculas)
-- ============================================================

BEGIN;

\echo '🔧 MIGRATION 016: Corrigindo action EXECUTE em maiúsculas...'

-- Identificar o registro problemático
SELECT 
    p.id, 
    p.action, 
    sf.name as feature_name
FROM permissions p
JOIN system_features sf ON p.feature_id = sf.id
WHERE p.action = 'EXECUTE';

\echo ''
\echo 'Corrigindo...'

-- Corrigir para minúsculas
UPDATE permissions
SET action = 'execute'
WHERE action = 'EXECUTE';

\echo '✅ Action corrigida para minúsculas'

-- Verificar se ainda existe algum em maiúsculas
DO $$
DECLARE
    uppercase_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO uppercase_count
    FROM permissions
    WHERE action = 'EXECUTE';
    
    IF uppercase_count > 0 THEN
        RAISE EXCEPTION '❌ Ainda existem % registros com EXECUTE em maiúsculas!', uppercase_count;
    ELSE
        RAISE NOTICE '✅ Nenhum registro com EXECUTE em maiúsculas encontrado!';
    END IF;
END $$;

-- Mostrar distribuição final
\echo ''
\echo '📊 Distribuição final de ações:'
SELECT action, COUNT(*) as qtd
FROM permissions
GROUP BY action
ORDER BY action;

COMMIT;

\echo ''
\echo '✅ MIGRATION 016 CONCLUÍDA COM SUCESSO!'




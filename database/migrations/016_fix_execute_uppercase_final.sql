-- ============================================================
-- MIGRATION 016: Corrigir EXECUTE em maiusculas
-- ============================================================
-- Problema: 1 permissao com action='EXECUTE' (maiusculas)
-- Solucao: Padronizar para 'execute' (minusculas) + constraint
-- ============================================================

BEGIN;

-- 1. Corrigir para minusculas
UPDATE permissions
SET action = 'execute'
WHERE action = 'EXECUTE';

-- 2. Adicionar constraint para prevenir maiusculas no futuro
ALTER TABLE permissions 
DROP CONSTRAINT IF EXISTS check_action_lowercase;

ALTER TABLE permissions 
ADD CONSTRAINT check_action_lowercase 
CHECK (action = LOWER(action));

-- 3. Verificar resultado
SELECT 
    'Total de acoes:' as info,
    COUNT(DISTINCT action) as qtd_acoes,
    COUNT(*) as total_permissions
FROM permissions;

SELECT action, COUNT(*) as qtd
FROM permissions
GROUP BY action
ORDER BY action;

COMMIT;




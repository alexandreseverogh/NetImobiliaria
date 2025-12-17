-- Migration 016: Corrigir EXECUTE em maiusculas para minusculas
-- Problema: 1 permissao com action='EXECUTE' (maiusculas)
-- Solucao: Padronizar para 'execute' (minusculas)

BEGIN;

-- Corrigir para minusculas
UPDATE permissions
SET action = 'execute'
WHERE action = 'EXECUTE';

-- Verificar resultado
SELECT action, COUNT(*) as qtd
FROM permissions
GROUP BY action
ORDER BY action;

COMMIT;




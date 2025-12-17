-- ============================================================
-- MIGRATION 019: Corrigir Slugs - Remover Artigos
-- ============================================================
-- PARTE 1: Corrigir slugs existentes (manual)
-- PARTE 2: Melhorar trigger para futuras funcionalidades
-- ============================================================

BEGIN;

-- ============================================================
-- LISTA DE SLUGS PROBLEMÁTICOS (identificados)
-- ============================================================

SELECT 
    '=== SLUGS ANTES DA CORRECAO ===' as info,
    COUNT(*) as total_com_artigos
FROM system_features 
WHERE slug LIKE '%-de-%' OR slug LIKE '%-do-%' OR slug LIKE '%-da-%';

-- ============================================================
-- CORREÇÃO MANUAL DOS SLUGS CONHECIDOS
-- ============================================================

-- Tipos
UPDATE system_features SET slug = 'tipos-imoveis' WHERE slug = 'tipos-de-imoveis';
UPDATE system_features SET slug = 'tipos-documentos' WHERE slug = 'tipos-de-documentos';

-- Status e Finalidades
UPDATE system_features SET slug = 'status-imoveis' WHERE slug = 'status-de-imoveis';
UPDATE system_features SET slug = 'finalidades-imoveis' WHERE slug = 'finalidades-de-imoveis';
UPDATE system_features SET slug = 'mudanca-status' WHERE slug = 'mudanca-de-status';

-- Logs
UPDATE system_features SET slug = 'analise-logs' WHERE slug = 'analise-de-logs';
UPDATE system_features SET slug = 'auditoria-logs-sistema' WHERE slug = 'auditoria-de-logs-do-sistema';
UPDATE system_features SET slug = 'relatorios-logs' WHERE slug = 'relatorios-de-logs';
UPDATE system_features SET slug = 'configuracoes-logs' WHERE slug = 'configuraces-de-logs';
UPDATE system_features SET slug = 'expurgo-historico-login-logout' WHERE slug = 'expurgo-de-historico-de-login-e-logout';

-- Sistema
UPDATE system_features SET slug = 'funcionalidades-sistema' WHERE slug = 'funcionalidades-do-sistema';
UPDATE system_features SET slug = 'configuracao-sidebar' WHERE slug = 'configuracao-da-sidebar';
UPDATE system_features SET slug = 'gestao-perfis' WHERE slug = 'gestao-de-perfis';
UPDATE system_features SET slug = 'gestao-permissoes' WHERE slug = 'gestao-de-permissoes';
UPDATE system_features SET slug = 'hierarquia-perfis' WHERE slug = 'hierarquia-de-perfis';
UPDATE system_features SET slug = 'monitoramento-seguranca' WHERE slug = 'monitoramento-de-seguranca';
UPDATE system_features SET slug = 'gestao-2fa-autenticacao-dois-fatores' WHERE slug = 'gest-o-de-2fa-autentica-o-por-dois-fatores';

-- Monitoramento
UPDATE system_features SET slug = 'monitoramento-auditoria-login-logout-2fa' WHERE slug = 'monitoramento-e-auditoria-de-tentativas-de-login-logout-com-status-2fa';

-- Verificar resultado
SELECT 
    '=== SLUGS DEPOIS DA CORRECAO ===' as info,
    COUNT(*) as total_com_artigos
FROM system_features 
WHERE slug LIKE '%-de-%' OR slug LIKE '%-do-%' OR slug LIKE '%-da-%';

-- Mostrar slugs corrigidos
SELECT id, name, slug 
FROM system_features 
WHERE id IN (2, 4, 5, 3, 11, 12, 13, 14, 15, 32, 33, 37, 38, 39, 40, 41, 44, 49)
ORDER BY id;

COMMIT;

-- ============================================================
-- MENSAGEM FINAL
-- ============================================================

SELECT '====================================================' as info
UNION ALL SELECT 'PARTE 1 CONCLUIDA: Slugs existentes corrigidos!' as info
UNION ALL SELECT 'Total de slugs corrigidos: 17' as info
UNION ALL SELECT 'Proximo passo: Melhorar trigger (PARTE 2)' as info
UNION ALL SELECT '====================================================' as info;




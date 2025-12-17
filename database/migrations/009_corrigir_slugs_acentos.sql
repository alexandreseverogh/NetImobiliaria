-- ============================================================
-- MIGRATION 009: Corrigir slugs com problemas de acentuação
-- Data: 2025-10-29
-- ============================================================

\echo 'Corrigindo slugs com substituições estranhas de acentos...'
\echo ''

-- Corrigir manualmente os slugs problemáticos
UPDATE system_features SET slug = 'imoveis' WHERE slug = 'im-veis';
UPDATE system_features SET slug = 'usuarios' WHERE slug = 'usu-rios';
UPDATE system_features SET slug = 'proprietarios' WHERE slug = 'propriet-rios';
UPDATE system_features SET slug = 'gestao-de-perfis' WHERE slug = 'gest-o-de-perfis';
UPDATE system_features SET slug = 'gestao-de-permissoes' WHERE slug = 'gest-o-de-permiss-es';
UPDATE system_features SET slug = 'configuracao-da-sidebar' WHERE slug = 'configura-o-da-sidebar';
UPDATE system_features SET slug = 'configuracoes-de-logs' WHERE slug = 'configura-es-de-logs';
UPDATE system_features SET slug = 'mudanca-de-status' WHERE slug = 'mudan-a-de-status';
UPDATE system_features SET slug = 'relatorios' WHERE slug = 'relat-rios';
UPDATE system_features SET slug = 'relatorios-de-logs' WHERE slug = 'relat-rios-de-logs';
UPDATE system_features SET slug = 'analise-de-logs' WHERE slug = 'an-lise-de-logs';
UPDATE system_features SET slug = 'monitoramento-de-seguranca' WHERE slug = 'monitaramento-de-seguran-a';
UPDATE system_features SET slug = 'expurgo-de-historico-de-login-e-logout' WHERE slug = 'expurgo-de-hist-rico-de-login-e-logout';
UPDATE system_features SET slug = 'tipos-de-imoveis' WHERE slug = 'tipos-de-im-veis';
UPDATE system_features SET slug = 'finalidades-de-imoveis' WHERE slug = 'finalidades-de-im-veis';
UPDATE system_features SET slug = 'status-de-imoveis' WHERE slug = 'status-de-im-veis';
UPDATE system_features SET slug = 'sessoes' WHERE slug = 'sess-es';

\echo ''
\echo 'Slugs corrigidos:'

-- Mostrar slugs limpos
SELECT 
    id,
    name,
    slug
FROM system_features
WHERE is_active = true
ORDER BY name;

\echo ''
\echo '✅ Slugs corrigidos e profissionais!'




-- ================================================================
-- MIGRATION 020: CORREÇÃO SIMPLES DE SLUGS (SEM ARTIGOS)
-- ================================================================
-- IMPORTANTE: Execute este script LINHA POR LINHA no pgAdmin4
-- Após cada UPDATE, verifique se funcionou antes de continuar
-- ================================================================

-- 1. Funcionalidades do Sistema
UPDATE system_features SET slug = 'funcionalidades-sistema' WHERE id = 2;

-- 2. Hierarquia de Perfis
UPDATE system_features SET slug = 'hierarquia-perfis' WHERE id = 3;

-- 3. Gestão de Perfis
UPDATE system_features SET slug = 'gestao-perfis' WHERE id = 4;

-- 4. Gestão de Permissões
UPDATE system_features SET slug = 'gestao-permissoes' WHERE id = 11;

-- 5. Tipos de Imóveis
UPDATE system_features SET slug = 'tipos-imoveis' WHERE id = 12;

-- 6. Finalidades de Imóveis
UPDATE system_features SET slug = 'finalidades-imoveis' WHERE id = 13;

-- 7. Status de Imóveis
UPDATE system_features SET slug = 'status-imoveis' WHERE id = 14;

-- 8. Imóveis
UPDATE system_features SET slug = 'imoveis' WHERE id = 15;

-- 9. Monitoramento e Auditoria de Login/Logout
UPDATE system_features SET slug = 'monitoramento-auditoria-tentativas-login-logout-com-status-2fa' WHERE id = 32;

-- 10. Auditoria de Logs do Sistema
UPDATE system_features SET slug = 'auditoria-logs-sistema' WHERE id = 33;

-- 11. Configuração da Sidebar
UPDATE system_features SET slug = 'configuracao-sidebar' WHERE id = 37;

-- 12. Gestão de Itens de Menu
UPDATE system_features SET slug = 'gestao-itens-menu' WHERE id = 38;

-- 13. Reordenação de Itens de Menu
UPDATE system_features SET slug = 'reordenacao-itens-menu' WHERE id = 39;

-- 14. Atribuição de Perfis a Menus
UPDATE system_features SET slug = 'atribuicao-perfis-menus' WHERE id = 40;

-- 15. Categorias de Amenidades
UPDATE system_features SET slug = 'categorias-amenidades' WHERE id = 41;

-- 16. Gestão de 2FA
UPDATE system_features SET slug = 'gestao-2fa-autenticacao-por-dois-fatores' WHERE id = 44;

-- 17. Análise de Logs
UPDATE system_features SET slug = 'analise-logs' WHERE id = 49;

-- ================================================================
-- VERIFICAÇÃO: Execute o SELECT abaixo para confirmar
-- ================================================================
SELECT 
    id, 
    name, 
    slug,
    CASE 
        WHEN slug LIKE '%-de-%' OR slug LIKE '%-do-%' OR slug LIKE '%-da-%' 
        THEN 'COM ARTIGO ❌' 
        ELSE 'SEM ARTIGO ✅' 
    END as status
FROM system_features 
WHERE id IN (2, 3, 4, 5, 11, 12, 13, 14, 15, 32, 33, 37, 38, 39, 40, 41, 44, 49)
ORDER BY id;


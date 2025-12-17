-- ============================================================
-- MIGRATION 019: Corrigir Slugs - Remover Artigos
-- EXECUTAR NO PGADMIN4
-- ============================================================
-- PARTE 1: Corrigir slugs existentes
-- PARTE 2: Melhorar trigger para futuras funcionalidades
-- ============================================================

-- ============================================================
-- VERIFICACAO INICIAL
-- ============================================================

SELECT 
    '=== ANTES DA CORRECAO ===' as status,
    COUNT(*) as total_com_artigos
FROM system_features 
WHERE slug LIKE '%-de-%' OR slug LIKE '%-do-%' OR slug LIKE '%-da-%';

-- ============================================================
-- PARTE 1: CORRECAO MANUAL DOS 17 SLUGS
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

-- 2FA
UPDATE system_features SET slug = 'gestao-2fa-autenticacao-dois-fatores' WHERE slug = 'gest-o-de-2fa-autentica-o-por-dois-fatores';

-- Monitoramento login/logout
UPDATE system_features SET slug = 'monitoramento-auditoria-login-logout-2fa' WHERE slug = 'monitoramento-e-auditoria-de-tentativas-de-login-logout-com-status-2fa';

-- ============================================================
-- VERIFICACAO POS-CORRECAO
-- ============================================================

SELECT 
    '=== DEPOIS DA CORRECAO ===' as status,
    COUNT(*) as total_com_artigos
FROM system_features 
WHERE slug LIKE '%-de-%' OR slug LIKE '%-do-%' OR slug LIKE '%-da-%';

-- Mostrar slugs corrigidos
SELECT id, name, slug 
FROM system_features 
WHERE id IN (2, 3, 4, 5, 11, 12, 13, 14, 15, 32, 33, 37, 38, 39, 40, 41, 44, 49)
ORDER BY id;

-- ============================================================
-- PARTE 2: MELHORAR FUNCAO normalize_to_slug()
-- ============================================================

CREATE OR REPLACE FUNCTION normalize_to_slug(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    -- 1. Converter para minúsculas
    result := LOWER(TRIM(input_text));
    
    -- 2. Remover acentos (se unaccent estiver disponível)
    BEGIN
        result := unaccent(result);
    EXCEPTION WHEN OTHERS THEN
        -- Se unaccent não estiver disponível, substituir manualmente
        result := TRANSLATE(result, 
            'áàâãäéèêëíìîïóòôõöúùûüçñ',
            'aaaaaeeeeiiiiooooouuuucn'
        );
    END;
    
    -- 3. NOVO: Remover artigos e preposições comuns
    result := REGEXP_REPLACE(result, '\s+(de|do|da|dos|das|para|com|em|e)\s+', '-', 'g');
    
    -- 4. Remover caracteres especiais (manter apenas letras, números e hífens)
    result := REGEXP_REPLACE(result, '[^a-z0-9\s-]', '', 'g');
    
    -- 5. Substituir espaços por hífens
    result := REGEXP_REPLACE(result, '\s+', '-', 'g');
    
    -- 6. Remover hífens duplicados
    result := REGEXP_REPLACE(result, '-+', '-', 'g');
    
    -- 7. Remover hífens no início e fim
    result := REGEXP_REPLACE(result, '^-|-$', '', 'g');
    
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Comentário
COMMENT ON FUNCTION normalize_to_slug(TEXT) IS 
    'Gera slug normalizado: remove acentos, artigos, caracteres especiais. Exemplo: "Tipos de Imóveis" → "tipos-imoveis"';

-- ============================================================
-- TESTE DO TRIGGER MELHORADO
-- ============================================================

-- Testar que novos slugs não terão artigos
SELECT 
    '=== TESTE DO TRIGGER MELHORADO ===' as info;

SELECT 
    'Tipos de Contratos' as nome_entrada,
    normalize_to_slug('Tipos de Contratos') as slug_gerado_esperado;

SELECT 
    'Gestão de Imóveis Premium' as nome_entrada,
    normalize_to_slug('Gestão de Imóveis Premium') as slug_gerado_esperado;

SELECT 
    'Relatórios do Sistema' as nome_entrada,
    normalize_to_slug('Relatórios do Sistema') as slug_gerado_esperado;

-- ============================================================
-- MENSAGEM FINAL
-- ============================================================

SELECT '====================================================' as resultado
UNION ALL SELECT 'MIGRATION 019 CONCLUIDA COM SUCESSO!' as resultado
UNION ALL SELECT '' as resultado
UNION ALL SELECT 'PARTE 1: 17 slugs corrigidos manualmente' as resultado
UNION ALL SELECT 'PARTE 2: Trigger melhorado (remove artigos)' as resultado
UNION ALL SELECT '' as resultado
UNION ALL SELECT 'PROXIMO PASSO: Invalidar tokens e testar!' as resultado
UNION ALL SELECT '====================================================' as resultado;


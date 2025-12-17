-- ================================================================
-- MIGRATION 022: MELHORAR FUNÇÃO normalize_to_slug()
-- ================================================================
-- Adicionar lógica para remover artigos automaticamente
-- Garantir que novos registros não terão "-de-", "-do-", "-da-"
-- ================================================================

BEGIN;

-- Recriar a função com lógica melhorada
CREATE OR REPLACE FUNCTION normalize_to_slug(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    -- 1. Converter para minúsculas e remover espaços extras
    result := LOWER(TRIM(input_text));
    
    -- 2. Remover acentos e caracteres especiais
    result := unaccent(result);
    
    -- 3. NOVO: Remover artigos e preposições comuns ANTES de converter espaços
    -- Isso garante que "Tipos de Imóveis" vire "tipos-imoveis" e não "tipos-de-imoveis"
    result := REGEXP_REPLACE(result, '\s+(de|do|da|dos|das|e|em|para|com|a|o|as|os)\s+', '-', 'gi');
    
    -- 4. Remover caracteres não alfanuméricos (mantém apenas a-z, 0-9, espaços e hífens)
    result := REGEXP_REPLACE(result, '[^a-z0-9\s-]', '', 'g');
    
    -- 5. Converter espaços restantes em hífens
    result := REGEXP_REPLACE(result, '\s+', '-', 'g');
    
    -- 6. Remover múltiplos hífens consecutivos (ex: "---" vira "-")
    result := REGEXP_REPLACE(result, '-+', '-', 'g');
    
    -- 7. Remover hífens no início ou fim
    result := REGEXP_REPLACE(result, '^-|-$', '', 'g');
    
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMIT;

-- ================================================================
-- TESTES AUTOMATIZADOS
-- ================================================================
SELECT 
    '🧪 TESTE' as tipo,
    'Entrada' as campo,
    'Resultado Esperado' as esperado,
    'Resultado Obtido' as obtido,
    'Status' as status;

-- Teste 1: Artigos simples
SELECT 
    '1' as tipo,
    'Tipos de Imóveis' as campo,
    'tipos-imoveis' as esperado,
    normalize_to_slug('Tipos de Imóveis') as obtido,
    CASE 
        WHEN normalize_to_slug('Tipos de Imóveis') = 'tipos-imoveis' 
        THEN '✅' 
        ELSE '❌' 
    END as status;

-- Teste 2: Múltiplos artigos
SELECT 
    '2' as tipo,
    'Gestão de Perfis de Usuários' as campo,
    'gestao-perfis-usuarios' as esperado,
    normalize_to_slug('Gestão de Perfis de Usuários') as obtido,
    CASE 
        WHEN normalize_to_slug('Gestão de Perfis de Usuários') = 'gestao-perfis-usuarios' 
        THEN '✅' 
        ELSE '❌' 
    END as status;

-- Teste 3: Artigo "do"
SELECT 
    '3' as tipo,
    'Funcionalidades do Sistema' as campo,
    'funcionalidades-sistema' as esperado,
    normalize_to_slug('Funcionalidades do Sistema') as obtido,
    CASE 
        WHEN normalize_to_slug('Funcionalidades do Sistema') = 'funcionalidades-sistema' 
        THEN '✅' 
        ELSE '❌' 
    END as status;

-- Teste 4: Artigo "da"
SELECT 
    '4' as tipo,
    'Configuração da Sidebar' as campo,
    'configuracao-sidebar' as esperado,
    normalize_to_slug('Configuração da Sidebar') as obtido,
    CASE 
        WHEN normalize_to_slug('Configuração da Sidebar') = 'configuracao-sidebar' 
        THEN '✅' 
        ELSE '❌' 
    END as status;

-- Teste 5: Múltiplas preposições
SELECT 
    '5' as tipo,
    'Monitoramento e Auditoria de Login com 2FA' as campo,
    'monitoramento-auditoria-login-2fa' as esperado,
    normalize_to_slug('Monitoramento e Auditoria de Login com 2FA') as obtido,
    CASE 
        WHEN normalize_to_slug('Monitoramento e Auditoria de Login com 2FA') = 'monitoramento-auditoria-login-2fa' 
        THEN '✅' 
        ELSE '❌' 
    END as status;

-- Teste 6: Acentos e caracteres especiais
SELECT 
    '6' as tipo,
    'Gestão de Permissões' as campo,
    'gestao-permissoes' as esperado,
    normalize_to_slug('Gestão de Permissões') as obtido,
    CASE 
        WHEN normalize_to_slug('Gestão de Permissões') = 'gestao-permissoes' 
        THEN '✅' 
        ELSE '❌' 
    END as status;

-- ================================================================
-- RESULTADO ESPERADO: TODOS OS TESTES COM ✅
-- ================================================================




-- ================================================================
-- MIGRATION 024: ATIVAR EXTENSAO unaccent E CRIAR FUNCAO
-- ================================================================
-- Correcao FINAL com extensao necessaria
-- ================================================================

BEGIN;

-- 1. ATIVAR a extensao unaccent (se ainda nao estiver ativa)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- 2. REMOVER a funcao antiga (se existir)
DROP FUNCTION IF EXISTS normalize_to_slug(text);

-- 3. CRIAR a nova funcao com logica melhorada
CREATE FUNCTION normalize_to_slug(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    -- Converter para minusculas e remover espacos extras
    result := LOWER(TRIM(input_text));
    
    -- Remover acentos e caracteres especiais
    result := unaccent(result);
    
    -- NOVO: Remover artigos e preposicoes ANTES de converter espacos
    result := REGEXP_REPLACE(result, '\s+(de|do|da|dos|das|e|em|para|com|a|o|as|os)\s+', '-', 'gi');
    
    -- Remover caracteres nao alfanumericos
    result := REGEXP_REPLACE(result, '[^a-z0-9\s-]', '', 'g');
    
    -- Converter espacos restantes em hifens
    result := REGEXP_REPLACE(result, '\s+', '-', 'g');
    
    -- Remover multiplos hifens consecutivos
    result := REGEXP_REPLACE(result, '-+', '-', 'g');
    
    -- Remover hifens no inicio ou fim
    result := REGEXP_REPLACE(result, '^-|-$', '', 'g');
    
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMIT;

-- ================================================================
-- TESTES AUTOMATIZADOS
-- ================================================================

SELECT 
    'Teste 1' as teste,
    'Tipos de Imóveis' as entrada,
    normalize_to_slug('Tipos de Imóveis') as obtido,
    CASE 
        WHEN normalize_to_slug('Tipos de Imóveis') = 'tipos-imoveis' 
        THEN 'OK' 
        ELSE 'ERRO' 
    END as status;

SELECT 
    'Teste 2' as teste,
    'Gestão de Perfis' as entrada,
    normalize_to_slug('Gestão de Perfis') as obtido,
    CASE 
        WHEN normalize_to_slug('Gestão de Perfis') = 'gestao-perfis' 
        THEN 'OK' 
        ELSE 'ERRO' 
    END as status;

SELECT 
    'Teste 3' as teste,
    'Funcionalidades do Sistema' as entrada,
    normalize_to_slug('Funcionalidades do Sistema') as obtido,
    CASE 
        WHEN normalize_to_slug('Funcionalidades do Sistema') = 'funcionalidades-sistema' 
        THEN 'OK' 
        ELSE 'ERRO' 
    END as status;

SELECT 
    'Teste 4' as teste,
    'Configuração da Sidebar' as entrada,
    normalize_to_slug('Configuração da Sidebar') as obtido,
    CASE 
        WHEN normalize_to_slug('Configuração da Sidebar') = 'configuracao-sidebar' 
        THEN 'OK' 
        ELSE 'ERRO' 
    END as status;

-- ================================================================
-- RESULTADO ESPERADO: TODOS OS TESTES COM STATUS = OK
-- ================================================================


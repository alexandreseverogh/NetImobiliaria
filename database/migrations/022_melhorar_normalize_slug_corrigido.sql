-- ================================================================
-- MIGRATION 022: MELHORAR FUNCAO normalize_to_slug()
-- ================================================================
-- Adicionar logica para remover artigos automaticamente
-- ================================================================

BEGIN;

-- Recriar a funcao com logica melhorada
CREATE OR REPLACE FUNCTION normalize_to_slug(input_text TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    -- 1. Converter para minusculas e remover espacos extras
    result := LOWER(TRIM(input_text));
    
    -- 2. Remover acentos e caracteres especiais
    result := unaccent(result);
    
    -- 3. NOVO: Remover artigos e preposicoes comuns ANTES de converter espacos
    result := REGEXP_REPLACE(result, '\s+(de|do|da|dos|das|e|em|para|com|a|o|as|os)\s+', '-', 'gi');
    
    -- 4. Remover caracteres nao alfanumericos (manter apenas a-z, 0-9, espacos e hifens)
    result := REGEXP_REPLACE(result, '[^a-z0-9\s-]', '', 'g');
    
    -- 5. Converter espacos restantes em hifens
    result := REGEXP_REPLACE(result, '\s+', '-', 'g');
    
    -- 6. Remover multiplos hifens consecutivos
    result := REGEXP_REPLACE(result, '-+', '-', 'g');
    
    -- 7. Remover hifens no inicio ou fim
    result := REGEXP_REPLACE(result, '^-|-$', '', 'g');
    
    RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMIT;

-- ================================================================
-- TESTES AUTOMATIZADOS
-- ================================================================

-- Teste 1
SELECT 
    'Teste 1' as teste,
    'Tipos de Imoveis' as entrada,
    'tipos-imoveis' as esperado,
    normalize_to_slug('Tipos de Imoveis') as obtido,
    CASE 
        WHEN normalize_to_slug('Tipos de Imoveis') = 'tipos-imoveis' 
        THEN 'OK' 
        ELSE 'ERRO' 
    END as status;

-- Teste 2
SELECT 
    'Teste 2' as teste,
    'Gestao de Perfis' as entrada,
    'gestao-perfis' as esperado,
    normalize_to_slug('Gestao de Perfis') as obtido,
    CASE 
        WHEN normalize_to_slug('Gestao de Perfis') = 'gestao-perfis' 
        THEN 'OK' 
        ELSE 'ERRO' 
    END as status;

-- Teste 3
SELECT 
    'Teste 3' as teste,
    'Funcionalidades do Sistema' as entrada,
    'funcionalidades-sistema' as esperado,
    normalize_to_slug('Funcionalidades do Sistema') as obtido,
    CASE 
        WHEN normalize_to_slug('Funcionalidades do Sistema') = 'funcionalidades-sistema' 
        THEN 'OK' 
        ELSE 'ERRO' 
    END as status;

-- Teste 4
SELECT 
    'Teste 4' as teste,
    'Configuracao da Sidebar' as entrada,
    'configuracao-sidebar' as esperado,
    normalize_to_slug('Configuracao da Sidebar') as obtido,
    CASE 
        WHEN normalize_to_slug('Configuracao da Sidebar') = 'configuracao-sidebar' 
        THEN 'OK' 
        ELSE 'ERRO' 
    END as status;

-- ================================================================
-- RESULTADO ESPERADO: TODOS OS TESTES COM STATUS = OK
-- ================================================================




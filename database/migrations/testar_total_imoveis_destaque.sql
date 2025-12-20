-- Script de teste: Verificar total de imóveis com destaque

-- 1. Verificar estrutura dos campos de destaque
SELECT 
    'ESTRUTURA DOS CAMPOS' as tipo,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'imoveis'
AND column_name IN ('destaque', 'destaque_nacional', 'ativo')
ORDER BY column_name;

-- 2. Contar imóveis com destaque_nacional = true
SELECT 
    'IMÓVEIS COM DESTAQUE NACIONAL' as tipo,
    COUNT(*) as total
FROM imoveis
WHERE destaque_nacional = true
AND ativo = true;

-- 3. Contar imóveis com destaque = true
SELECT 
    'IMÓVEIS COM DESTAQUE LOCAL' as tipo,
    COUNT(*) as total
FROM imoveis
WHERE destaque = true
AND ativo = true;

-- 4. Contar imóveis com destaque_nacional OU destaque = true (sem COALESCE)
SELECT 
    'TOTAL SEM COALESCE' as tipo,
    COUNT(DISTINCT id) as total_imoveis
FROM imoveis
WHERE (destaque_nacional = true OR destaque = true)
AND ativo = true;

-- 5. Contar imóveis com destaque_nacional OU destaque = true (com COALESCE)
SELECT 
    'TOTAL COM COALESCE' as tipo,
    COUNT(DISTINCT id) as total_imoveis
FROM imoveis
WHERE (COALESCE(destaque_nacional, false) = true OR COALESCE(destaque, false) = true)
AND COALESCE(ativo, false) = true;

-- 6. Verificar valores NULL
SELECT 
    'VERIFICAÇÃO DE NULLS' as tipo,
    COUNT(*) FILTER (WHERE destaque_nacional IS NULL) as destaque_nacional_null,
    COUNT(*) FILTER (WHERE destaque IS NULL) as destaque_null,
    COUNT(*) FILTER (WHERE ativo IS NULL) as ativo_null,
    COUNT(*) FILTER (WHERE destaque_nacional = true) as destaque_nacional_true,
    COUNT(*) FILTER (WHERE destaque = true) as destaque_true,
    COUNT(*) FILTER (WHERE destaque_nacional = false) as destaque_nacional_false,
    COUNT(*) FILTER (WHERE destaque = false) as destaque_false
FROM imoveis;

-- 7. Ver alguns exemplos
SELECT 
    'EXEMPLOS DE IMÓVEIS' as tipo,
    id,
    codigo,
    destaque_nacional,
    destaque,
    ativo
FROM imoveis
WHERE destaque_nacional = true OR destaque = true
LIMIT 10;









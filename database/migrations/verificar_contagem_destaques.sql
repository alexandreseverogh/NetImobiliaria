-- Script de verificação: Contar imóveis com destaque corretamente

-- 1. Contar imóveis com destaque_nacional = true
SELECT 
    'DESTAQUE NACIONAL' as tipo,
    COUNT(*) as total
FROM imoveis
WHERE destaque_nacional = true
AND ativo = true;

-- 2. Contar imóveis com destaque = true
SELECT 
    'DESTAQUE LOCAL' as tipo,
    COUNT(*) as total
FROM imoveis
WHERE destaque = true
AND ativo = true;

-- 3. Contar imóveis únicos com destaque_nacional OU destaque = true
SELECT 
    'TOTAL ÚNICO (NACIONAL OU LOCAL)' as tipo,
    COUNT(DISTINCT id) as total
FROM imoveis
WHERE (destaque_nacional = true OR destaque = true)
AND ativo = true;

-- 4. Verificar imóveis que têm AMBOS os destaques
SELECT 
    'IMÓVEIS COM AMBOS OS DESTAQUES' as tipo,
    COUNT(*) as total
FROM imoveis
WHERE destaque_nacional = true 
AND destaque = true
AND ativo = true;

-- 5. Verificar se há imóveis com destaque mas sem estado_fk
SELECT 
    'IMÓVEIS COM DESTAQUE MAS SEM ESTADO' as tipo,
    COUNT(*) as total
FROM imoveis
WHERE destaque = true
AND ativo = true
AND estado_fk IS NULL;

-- 6. Verificar contagem por estado (destaque = true)
SELECT 
    'CONTAGEM POR ESTADO (DESTAQUE LOCAL)' as tipo,
    estado_fk,
    COUNT(*) as total_imoveis
FROM imoveis
WHERE destaque = true
AND ativo = true
AND estado_fk IS NOT NULL
GROUP BY estado_fk
ORDER BY estado_fk;

-- 7. Verificar se a query atual está contando corretamente
SELECT 
    'TESTE QUERY ATUAL' as tipo,
    vdl.estado_fk,
    COUNT(i.id) FILTER (WHERE i.id IS NOT NULL) as total_imoveis_query_atual
FROM valor_destaque_local vdl
LEFT JOIN imoveis i ON i.estado_fk = vdl.estado_fk 
    AND i.destaque = true 
    AND i.ativo = true
WHERE vdl.cidade_fk = 'TODAS'
GROUP BY vdl.estado_fk
ORDER BY vdl.estado_fk;

-- 8. Verificar contagem correta (começando dos imóveis)
SELECT 
    'TESTE QUERY CORRIGIDA' as tipo,
    i.estado_fk,
    COUNT(DISTINCT i.id) as total_imoveis_query_corrigida
FROM imoveis i
INNER JOIN valor_destaque_local vdl ON i.estado_fk = vdl.estado_fk AND vdl.cidade_fk = 'TODAS'
WHERE i.destaque = true 
    AND i.ativo = true
    AND i.estado_fk IS NOT NULL
GROUP BY i.estado_fk
ORDER BY i.estado_fk;

-- 9. Comparar totais
SELECT 
    'COMPARAÇÃO' as tipo,
    (SELECT COUNT(*) FROM imoveis WHERE destaque = true AND ativo = true) as total_real_destaque_local,
    (SELECT SUM(total_imoveis_query_atual) FROM (
        SELECT COUNT(i.id) FILTER (WHERE i.id IS NOT NULL) as total_imoveis_query_atual
        FROM valor_destaque_local vdl
        LEFT JOIN imoveis i ON i.estado_fk = vdl.estado_fk 
            AND i.destaque = true 
            AND i.ativo = true
        WHERE vdl.cidade_fk = 'TODAS'
        GROUP BY vdl.estado_fk
    ) subquery) as total_query_atual,
    (SELECT COUNT(DISTINCT i.id) 
     FROM imoveis i
     INNER JOIN valor_destaque_local vdl ON i.estado_fk = vdl.estado_fk AND vdl.cidade_fk = 'TODAS'
     WHERE i.destaque = true 
         AND i.ativo = true
         AND i.estado_fk IS NOT NULL) as total_query_corrigida;









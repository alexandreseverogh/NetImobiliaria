-- Script de verificação: Encontrar o imóvel perdido na contagem de destaque local

-- 1. Total de imóveis com destaque = true (deve ser 63)
SELECT 
    'TOTAL COM DESTAQUE = TRUE' as tipo,
    COUNT(*) as total
FROM imoveis
WHERE destaque = true;

-- 2. Total de imóveis com destaque = true E ativo = true
SELECT 
    'TOTAL COM DESTAQUE = TRUE E ATIVO = TRUE' as tipo,
    COUNT(*) as total
FROM imoveis
WHERE destaque = true
AND ativo = true;

-- 3. Total de imóveis com destaque = true, ativo = true E estado_fk IS NOT NULL
SELECT 
    'TOTAL COM DESTAQUE, ATIVO E COM ESTADO' as tipo,
    COUNT(*) as total
FROM imoveis
WHERE destaque = true
AND ativo = true
AND estado_fk IS NOT NULL;

-- 4. Total de imóveis com destaque = true, ativo = true E estado_fk existe em valor_destaque_local
SELECT 
    'TOTAL COM DESTAQUE, ATIVO E ESTADO EM VALOR_DESTAQUE_LOCAL' as tipo,
    COUNT(DISTINCT i.id) as total
FROM imoveis i
INNER JOIN valor_destaque_local vdl ON i.estado_fk = vdl.estado_fk AND vdl.cidade_fk = 'TODAS'
WHERE i.destaque = true
AND i.ativo = true;

-- 5. Encontrar imóveis com destaque = true mas sem estado_fk válido
SELECT 
    'IMÓVEIS COM DESTAQUE MAS SEM ESTADO VÁLIDO' as tipo,
    i.id,
    i.codigo,
    i.estado_fk,
    i.ativo,
    i.destaque,
    CASE 
        WHEN i.estado_fk IS NULL THEN 'SEM ESTADO_FK'
        WHEN NOT EXISTS (SELECT 1 FROM valor_destaque_local WHERE estado_fk = i.estado_fk AND cidade_fk = 'TODAS') THEN 'ESTADO NÃO EXISTE EM VALOR_DESTAQUE_LOCAL'
        ELSE 'OK'
    END as motivo
FROM imoveis i
WHERE i.destaque = true
AND i.ativo = true
AND (
    i.estado_fk IS NULL 
    OR NOT EXISTS (SELECT 1 FROM valor_destaque_local WHERE estado_fk = i.estado_fk AND cidade_fk = 'TODAS')
);

-- 6. Verificar se há imóveis com destaque = true mas ativo = false
SELECT 
    'IMÓVEIS COM DESTAQUE MAS ATIVO = FALSE' as tipo,
    COUNT(*) as total
FROM imoveis
WHERE destaque = true
AND ativo = false;

-- 7. Comparar contagens
SELECT 
    'COMPARAÇÃO FINAL' as tipo,
    (SELECT COUNT(*) FROM imoveis WHERE destaque = true) as total_geral_destaque,
    (SELECT COUNT(*) FROM imoveis WHERE destaque = true AND ativo = true) as total_destaque_ativo,
    (SELECT COUNT(*) FROM imoveis WHERE destaque = true AND ativo = true AND estado_fk IS NOT NULL) as total_com_estado,
    (SELECT COUNT(DISTINCT i.id) 
     FROM imoveis i
     INNER JOIN valor_destaque_local vdl ON i.estado_fk = vdl.estado_fk AND vdl.cidade_fk = 'TODAS'
     WHERE i.destaque = true AND i.ativo = true) as total_na_query;








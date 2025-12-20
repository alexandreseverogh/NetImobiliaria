-- Script para encontrar imóveis com destaque = true mas sem estado_fk

-- 1. Encontrar imóveis com destaque = true e estado_fk = NULL
SELECT 
    id,
    codigo,
    estado_fk,
    cidade_fk,
    destaque,
    destaque_nacional,
    ativo,
    created_at
FROM imoveis
WHERE destaque = true
AND ativo = true
AND estado_fk IS NULL
ORDER BY created_at DESC;

-- 2. Verificar se há outros campos que possam indicar o estado (endereço, etc)
SELECT 
    id,
    codigo,
    estado_fk,
    cidade_fk,
    endereco,
    bairro,
    cep,
    destaque,
    ativo
FROM imoveis
WHERE destaque = true
AND ativo = true
AND estado_fk IS NULL;

-- 3. Verificar se há imóveis com destaque = true mas estado_fk não existe em valor_destaque_local
SELECT 
    i.id,
    i.codigo,
    i.estado_fk,
    i.cidade_fk,
    i.destaque,
    i.ativo,
    CASE 
        WHEN i.estado_fk IS NULL THEN 'SEM ESTADO_FK'
        WHEN NOT EXISTS (
            SELECT 1 FROM valor_destaque_local 
            WHERE estado_fk = i.estado_fk AND cidade_fk = 'TODAS'
        ) THEN 'ESTADO NÃO EXISTE EM VALOR_DESTAQUE_LOCAL'
        ELSE 'OK'
    END as problema
FROM imoveis i
WHERE i.destaque = true
AND i.ativo = true
AND (
    i.estado_fk IS NULL 
    OR NOT EXISTS (
        SELECT 1 FROM valor_destaque_local 
        WHERE estado_fk = i.estado_fk AND cidade_fk = 'TODAS'
    )
);









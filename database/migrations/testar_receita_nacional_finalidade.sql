-- Script de teste: Verificar receita nacional estratificada por finalidade

-- 1. Verificar imóveis com destaque_nacional = true
SELECT 
    'IMÓVEIS COM DESTAQUE NACIONAL' as tipo,
    COUNT(*) as total,
    COUNT(finalidade_fk) as com_finalidade,
    COUNT(*) - COUNT(finalidade_fk) as sem_finalidade
FROM imoveis
WHERE destaque_nacional = true
AND ativo = true;

-- 2. Verificar finalidades disponíveis
SELECT 
    'FINALIDADES DISPONÍVEIS' as tipo,
    id,
    nome
FROM finalidades_imovel
WHERE ativo = true
ORDER BY nome;

-- 3. Testar query de receita nacional estratificada
SELECT 
    COALESCE(fi.nome, 'SEM FINALIDADE') as finalidade,
    COUNT(*) as total_imoveis,
    COALESCE((SELECT vl_destaque_nacional FROM parametros LIMIT 1), 0) as valor_unitario,
    COUNT(*) * COALESCE((SELECT vl_destaque_nacional FROM parametros LIMIT 1), 0) as receita_total
FROM imoveis i
LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
WHERE i.destaque_nacional = true
AND i.ativo = true
GROUP BY COALESCE(fi.nome, 'SEM FINALIDADE')
ORDER BY COALESCE(fi.nome, 'SEM FINALIDADE');

-- 4. Verificar alguns imóveis específicos
SELECT 
    'DETALHES DE IMÓVEIS' as tipo,
    i.id,
    i.codigo,
    i.destaque_nacional,
    i.finalidade_fk,
    fi.nome as finalidade_nome,
    i.ativo
FROM imoveis i
LEFT JOIN finalidades_imovel fi ON i.finalidade_fk = fi.id
WHERE i.destaque_nacional = true
AND i.ativo = true
LIMIT 10;


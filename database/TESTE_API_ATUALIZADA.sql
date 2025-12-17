-- ============================================================
-- TESTE DE VALIDAÇÃO DA API ATUALIZADA
-- ============================================================
-- Objetivo: Verificar se as alterações da API estão funcionando
-- ============================================================

-- 1. Verificar se o campo Crud_Execute está sendo retornado na consulta
SELECT 
    sf.id,
    sf.name,
    sf."Crud_Execute",
    COUNT(p.id) as permissions_count
FROM system_features sf
LEFT JOIN permissions p ON sf.id = p.feature_id
GROUP BY sf.id, sf.name, sf."Crud_Execute"
ORDER BY sf.name
LIMIT 10;

-- 2. Verificar estrutura da tabela system_features
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'system_features' 
ORDER BY ordinal_position;

-- 3. Verificar se existem funcionalidades sem Crud_Execute definido
SELECT 
    COUNT(*) as total,
    COUNT("Crud_Execute") as com_tipo,
    COUNT(*) - COUNT("Crud_Execute") as sem_tipo
FROM system_features;

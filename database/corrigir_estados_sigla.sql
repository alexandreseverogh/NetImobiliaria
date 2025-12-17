-- ================================================================
-- Script para corrigir estado_fk: Converter NOME para SIGLA
-- ================================================================
-- 
-- IMPORTANTE: Este script converte nomes completos de estados (ex: "Pernambuco")
-- para suas respectivas siglas (ex: "PE") nas tabelas clientes e proprietarios.
--
-- Execute com:
-- $env:PGPASSWORD='Roberto@2007'
-- psql -U postgres -d net_imobiliaria -f database/corrigir_estados_sigla.sql
-- ================================================================

BEGIN;

-- Verificar dados ANTES da correção
SELECT 'ANTES DA CORREÇÃO - CLIENTES' as status;
SELECT 
    COUNT(*) as total_clientes,
    COUNT(CASE WHEN LENGTH(estado_fk) > 2 THEN 1 END) as com_nome_completo,
    COUNT(CASE WHEN LENGTH(estado_fk) = 2 THEN 1 END) as com_sigla
FROM clientes
WHERE estado_fk IS NOT NULL;

SELECT 'ANTES DA CORREÇÃO - PROPRIETÁRIOS' as status;
SELECT 
    COUNT(*) as total_proprietarios,
    COUNT(CASE WHEN LENGTH(estado_fk) > 2 THEN 1 END) as com_nome_completo,
    COUNT(CASE WHEN LENGTH(estado_fk) = 2 THEN 1 END) as com_sigla
FROM proprietarios
WHERE estado_fk IS NOT NULL;

-- ===== CORRIGIR TABELA CLIENTES =====

-- Acre
UPDATE clientes SET estado_fk = 'AC' WHERE estado_fk = 'Acre';

-- Alagoas
UPDATE clientes SET estado_fk = 'AL' WHERE estado_fk = 'Alagoas';

-- Amapá
UPDATE clientes SET estado_fk = 'AP' WHERE estado_fk = 'Amapá';

-- Amazonas
UPDATE clientes SET estado_fk = 'AM' WHERE estado_fk = 'Amazonas';

-- Bahia
UPDATE clientes SET estado_fk = 'BA' WHERE estado_fk = 'Bahia';

-- Ceará
UPDATE clientes SET estado_fk = 'CE' WHERE estado_fk = 'Ceará';

-- Distrito Federal
UPDATE clientes SET estado_fk = 'DF' WHERE estado_fk = 'Distrito Federal';

-- Espírito Santo
UPDATE clientes SET estado_fk = 'ES' WHERE estado_fk = 'Espírito Santo';

-- Goiás
UPDATE clientes SET estado_fk = 'GO' WHERE estado_fk = 'Goiás';

-- Maranhão
UPDATE clientes SET estado_fk = 'MA' WHERE estado_fk = 'Maranhão';

-- Mato Grosso
UPDATE clientes SET estado_fk = 'MT' WHERE estado_fk = 'Mato Grosso';

-- Mato Grosso do Sul
UPDATE clientes SET estado_fk = 'MS' WHERE estado_fk = 'Mato Grosso do Sul';

-- Minas Gerais
UPDATE clientes SET estado_fk = 'MG' WHERE estado_fk = 'Minas Gerais';

-- Pará
UPDATE clientes SET estado_fk = 'PA' WHERE estado_fk = 'Pará';

-- Paraíba
UPDATE clientes SET estado_fk = 'PB' WHERE estado_fk = 'Paraíba';

-- Paraná
UPDATE clientes SET estado_fk = 'PR' WHERE estado_fk = 'Paraná';

-- Pernambuco
UPDATE clientes SET estado_fk = 'PE' WHERE estado_fk = 'Pernambuco';

-- Piauí
UPDATE clientes SET estado_fk = 'PI' WHERE estado_fk = 'Piauí';

-- Rio de Janeiro
UPDATE clientes SET estado_fk = 'RJ' WHERE estado_fk = 'Rio de Janeiro';

-- Rio Grande do Norte
UPDATE clientes SET estado_fk = 'RN' WHERE estado_fk = 'Rio Grande do Norte';

-- Rio Grande do Sul
UPDATE clientes SET estado_fk = 'RS' WHERE estado_fk = 'Rio Grande do Sul';

-- Rondônia
UPDATE clientes SET estado_fk = 'RO' WHERE estado_fk = 'Rondônia';

-- Roraima
UPDATE clientes SET estado_fk = 'RR' WHERE estado_fk = 'Roraima';

-- Santa Catarina
UPDATE clientes SET estado_fk = 'SC' WHERE estado_fk = 'Santa Catarina';

-- São Paulo
UPDATE clientes SET estado_fk = 'SP' WHERE estado_fk = 'São Paulo';

-- Sergipe
UPDATE clientes SET estado_fk = 'SE' WHERE estado_fk = 'Sergipe';

-- Tocantins
UPDATE clientes SET estado_fk = 'TO' WHERE estado_fk = 'Tocantins';

-- ===== CORRIGIR TABELA PROPRIETARIOS =====

-- Acre
UPDATE proprietarios SET estado_fk = 'AC' WHERE estado_fk = 'Acre';

-- Alagoas
UPDATE proprietarios SET estado_fk = 'AL' WHERE estado_fk = 'Alagoas';

-- Amapá
UPDATE proprietarios SET estado_fk = 'AP' WHERE estado_fk = 'Amapá';

-- Amazonas
UPDATE proprietarios SET estado_fk = 'AM' WHERE estado_fk = 'Amazonas';

-- Bahia
UPDATE proprietarios SET estado_fk = 'BA' WHERE estado_fk = 'Bahia';

-- Ceará
UPDATE proprietarios SET estado_fk = 'CE' WHERE estado_fk = 'Ceará';

-- Distrito Federal
UPDATE proprietarios SET estado_fk = 'DF' WHERE estado_fk = 'Distrito Federal';

-- Espírito Santo
UPDATE proprietarios SET estado_fk = 'ES' WHERE estado_fk = 'Espírito Santo';

-- Goiás
UPDATE proprietarios SET estado_fk = 'GO' WHERE estado_fk = 'Goiás';

-- Maranhão
UPDATE proprietarios SET estado_fk = 'MA' WHERE estado_fk = 'Maranhão';

-- Mato Grosso
UPDATE proprietarios SET estado_fk = 'MT' WHERE estado_fk = 'Mato Grosso';

-- Mato Grosso do Sul
UPDATE proprietarios SET estado_fk = 'MS' WHERE estado_fk = 'Mato Grosso do Sul';

-- Minas Gerais
UPDATE proprietarios SET estado_fk = 'MG' WHERE estado_fk = 'Minas Gerais';

-- Pará
UPDATE proprietarios SET estado_fk = 'PA' WHERE estado_fk = 'Pará';

-- Paraíba
UPDATE proprietarios SET estado_fk = 'PB' WHERE estado_fk = 'Paraíba';

-- Paraná
UPDATE proprietarios SET estado_fk = 'PR' WHERE estado_fk = 'Paraná';

-- Pernambuco
UPDATE proprietarios SET estado_fk = 'PE' WHERE estado_fk = 'Pernambuco';

-- Piauí
UPDATE proprietarios SET estado_fk = 'PI' WHERE estado_fk = 'Piauí';

-- Rio de Janeiro
UPDATE proprietarios SET estado_fk = 'RJ' WHERE estado_fk = 'Rio de Janeiro';

-- Rio Grande do Norte
UPDATE proprietarios SET estado_fk = 'RN' WHERE estado_fk = 'Rio Grande do Norte';

-- Rio Grande do Sul
UPDATE proprietarios SET estado_fk = 'RS' WHERE estado_fk = 'Rio Grande do Sul';

-- Rondônia
UPDATE proprietarios SET estado_fk = 'RO' WHERE estado_fk = 'Rondônia';

-- Roraima
UPDATE proprietarios SET estado_fk = 'RR' WHERE estado_fk = 'Roraima';

-- Santa Catarina
UPDATE proprietarios SET estado_fk = 'SC' WHERE estado_fk = 'Santa Catarina';

-- São Paulo
UPDATE proprietarios SET estado_fk = 'SP' WHERE estado_fk = 'São Paulo';

-- Sergipe
UPDATE proprietarios SET estado_fk = 'SE' WHERE estado_fk = 'Sergipe';

-- Tocantins
UPDATE proprietarios SET estado_fk = 'TO' WHERE estado_fk = 'Tocantins';

-- Verificar dados DEPOIS da correção
SELECT 'DEPOIS DA CORREÇÃO - CLIENTES' as status;
SELECT 
    COUNT(*) as total_clientes,
    COUNT(CASE WHEN LENGTH(estado_fk) > 2 THEN 1 END) as com_nome_completo,
    COUNT(CASE WHEN LENGTH(estado_fk) = 2 THEN 1 END) as com_sigla
FROM clientes
WHERE estado_fk IS NOT NULL;

SELECT 'DEPOIS DA CORREÇÃO - PROPRIETÁRIOS' as status;
SELECT 
    COUNT(*) as total_proprietarios,
    COUNT(CASE WHEN LENGTH(estado_fk) > 2 THEN 1 END) as com_nome_completo,
    COUNT(CASE WHEN LENGTH(estado_fk) = 2 THEN 1 END) as com_sigla
FROM proprietarios
WHERE estado_fk IS NOT NULL;

-- Mostrar alguns exemplos corrigidos
SELECT 'EXEMPLOS CORRIGIDOS - CLIENTES' as status;
SELECT id, uuid, nome, estado_fk, cidade_fk 
FROM clientes 
WHERE estado_fk IS NOT NULL 
ORDER BY id 
LIMIT 5;

SELECT 'EXEMPLOS CORRIGIDOS - PROPRIETÁRIOS' as status;
SELECT id, uuid, nome, estado_fk, cidade_fk 
FROM proprietarios 
WHERE estado_fk IS NOT NULL 
ORDER BY id 
LIMIT 5;

COMMIT;

-- ================================================================
-- SCRIPT CONCLUÍDO COM SUCESSO!
-- Todos os estados foram convertidos de NOME para SIGLA
-- ================================================================



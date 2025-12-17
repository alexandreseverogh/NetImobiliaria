-- Script para corrigir estado_fk: Converter NOME para SIGLA
-- Execute com: $env:PGPASSWORD='Roberto@2007'; psql -U postgres -d net_imobiliaria -f database/corrigir_estados_sigla_v2.sql

BEGIN;

-- Verificar dados ANTES da correcao
SELECT 'ANTES DA CORRECAO - CLIENTES' as status;
SELECT 
    COUNT(*) as total_clientes,
    COUNT(CASE WHEN LENGTH(estado_fk) > 2 THEN 1 END) as com_nome_completo,
    COUNT(CASE WHEN LENGTH(estado_fk) = 2 THEN 1 END) as com_sigla
FROM clientes
WHERE estado_fk IS NOT NULL;

SELECT 'ANTES DA CORRECAO - PROPRIETARIOS' as status;
SELECT 
    COUNT(*) as total_proprietarios,
    COUNT(CASE WHEN LENGTH(estado_fk) > 2 THEN 1 END) as com_nome_completo,
    COUNT(CASE WHEN LENGTH(estado_fk) = 2 THEN 1 END) as com_sigla
FROM proprietarios
WHERE estado_fk IS NOT NULL;

-- CORRIGIR TABELA CLIENTES
UPDATE clientes SET estado_fk = 'AC' WHERE estado_fk = 'Acre';
UPDATE clientes SET estado_fk = 'AL' WHERE estado_fk = 'Alagoas';
UPDATE clientes SET estado_fk = 'AP' WHERE estado_fk = 'Amapa';
UPDATE clientes SET estado_fk = 'AM' WHERE estado_fk = 'Amazonas';
UPDATE clientes SET estado_fk = 'BA' WHERE estado_fk = 'Bahia';
UPDATE clientes SET estado_fk = 'CE' WHERE estado_fk = 'Ceara';
UPDATE clientes SET estado_fk = 'DF' WHERE estado_fk = 'Distrito Federal';
UPDATE clientes SET estado_fk = 'ES' WHERE estado_fk = 'Espirito Santo';
UPDATE clientes SET estado_fk = 'GO' WHERE estado_fk = 'Goias';
UPDATE clientes SET estado_fk = 'MA' WHERE estado_fk = 'Maranhao';
UPDATE clientes SET estado_fk = 'MT' WHERE estado_fk = 'Mato Grosso';
UPDATE clientes SET estado_fk = 'MS' WHERE estado_fk = 'Mato Grosso do Sul';
UPDATE clientes SET estado_fk = 'MG' WHERE estado_fk = 'Minas Gerais';
UPDATE clientes SET estado_fk = 'PA' WHERE estado_fk = 'Para';
UPDATE clientes SET estado_fk = 'PB' WHERE estado_fk = 'Paraiba';
UPDATE clientes SET estado_fk = 'PR' WHERE estado_fk = 'Parana';
UPDATE clientes SET estado_fk = 'PE' WHERE estado_fk = 'Pernambuco';
UPDATE clientes SET estado_fk = 'PI' WHERE estado_fk = 'Piaui';
UPDATE clientes SET estado_fk = 'RJ' WHERE estado_fk = 'Rio de Janeiro';
UPDATE clientes SET estado_fk = 'RN' WHERE estado_fk = 'Rio Grande do Norte';
UPDATE clientes SET estado_fk = 'RS' WHERE estado_fk = 'Rio Grande do Sul';
UPDATE clientes SET estado_fk = 'RO' WHERE estado_fk = 'Rondonia';
UPDATE clientes SET estado_fk = 'RR' WHERE estado_fk = 'Roraima';
UPDATE clientes SET estado_fk = 'SC' WHERE estado_fk = 'Santa Catarina';
UPDATE clientes SET estado_fk = 'SP' WHERE estado_fk = 'Sao Paulo';
UPDATE clientes SET estado_fk = 'SE' WHERE estado_fk = 'Sergipe';
UPDATE clientes SET estado_fk = 'TO' WHERE estado_fk = 'Tocantins';

-- CORRIGIR TABELA PROPRIETARIOS
UPDATE proprietarios SET estado_fk = 'AC' WHERE estado_fk = 'Acre';
UPDATE proprietarios SET estado_fk = 'AL' WHERE estado_fk = 'Alagoas';
UPDATE proprietarios SET estado_fk = 'AP' WHERE estado_fk = 'Amapa';
UPDATE proprietarios SET estado_fk = 'AM' WHERE estado_fk = 'Amazonas';
UPDATE proprietarios SET estado_fk = 'BA' WHERE estado_fk = 'Bahia';
UPDATE proprietarios SET estado_fk = 'CE' WHERE estado_fk = 'Ceara';
UPDATE proprietarios SET estado_fk = 'DF' WHERE estado_fk = 'Distrito Federal';
UPDATE proprietarios SET estado_fk = 'ES' WHERE estado_fk = 'Espirito Santo';
UPDATE proprietarios SET estado_fk = 'GO' WHERE estado_fk = 'Goias';
UPDATE proprietarios SET estado_fk = 'MA' WHERE estado_fk = 'Maranhao';
UPDATE proprietarios SET estado_fk = 'MT' WHERE estado_fk = 'Mato Grosso';
UPDATE proprietarios SET estado_fk = 'MS' WHERE estado_fk = 'Mato Grosso do Sul';
UPDATE proprietarios SET estado_fk = 'MG' WHERE estado_fk = 'Minas Gerais';
UPDATE proprietarios SET estado_fk = 'PA' WHERE estado_fk = 'Para';
UPDATE proprietarios SET estado_fk = 'PB' WHERE estado_fk = 'Paraiba';
UPDATE proprietarios SET estado_fk = 'PR' WHERE estado_fk = 'Parana';
UPDATE proprietarios SET estado_fk = 'PE' WHERE estado_fk = 'Pernambuco';
UPDATE proprietarios SET estado_fk = 'PI' WHERE estado_fk = 'Piaui';
UPDATE proprietarios SET estado_fk = 'RJ' WHERE estado_fk = 'Rio de Janeiro';
UPDATE proprietarios SET estado_fk = 'RN' WHERE estado_fk = 'Rio Grande do Norte';
UPDATE proprietarios SET estado_fk = 'RS' WHERE estado_fk = 'Rio Grande do Sul';
UPDATE proprietarios SET estado_fk = 'RO' WHERE estado_fk = 'Rondonia';
UPDATE proprietarios SET estado_fk = 'RR' WHERE estado_fk = 'Roraima';
UPDATE proprietarios SET estado_fk = 'SC' WHERE estado_fk = 'Santa Catarina';
UPDATE proprietarios SET estado_fk = 'SP' WHERE estado_fk = 'Sao Paulo';
UPDATE proprietarios SET estado_fk = 'SE' WHERE estado_fk = 'Sergipe';
UPDATE proprietarios SET estado_fk = 'TO' WHERE estado_fk = 'Tocantins';

-- Verificar dados DEPOIS da correcao
SELECT 'DEPOIS DA CORRECAO - CLIENTES' as status;
SELECT 
    COUNT(*) as total_clientes,
    COUNT(CASE WHEN LENGTH(estado_fk) > 2 THEN 1 END) as com_nome_completo,
    COUNT(CASE WHEN LENGTH(estado_fk) = 2 THEN 1 END) as com_sigla
FROM clientes
WHERE estado_fk IS NOT NULL;

SELECT 'DEPOIS DA CORRECAO - PROPRIETARIOS' as status;
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

SELECT 'EXEMPLOS CORRIGIDOS - PROPRIETARIOS' as status;
SELECT id, uuid, nome, estado_fk, cidade_fk 
FROM proprietarios 
WHERE estado_fk IS NOT NULL 
ORDER BY id 
LIMIT 5;

COMMIT;

SELECT 'SCRIPT CONCLUIDO COM SUCESSO!' as status;



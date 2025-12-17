-- Script para corrigir problemas de encoding nas categorias
-- Net Imobiliária - Correção de Caracteres Acentuados

-- 1. Verificar a codificação atual do banco
SELECT 
    datname as "Database",
    pg_encoding_to_char(encoding) as "Encoding"
FROM pg_database 
WHERE datname = current_database();

-- 2. Verificar a codificação das tabelas
SELECT 
    schemaname,
    tablename,
    attname,
    pg_encoding_to_char(attencoding) as encoding
FROM pg_tables t
JOIN pg_attribute a ON a.attrelid = t.tablename::regclass
WHERE t.tablename IN ('categorias_amenidades', 'categorias_proximidades')
AND a.attnum > 0;

-- 3. Verificar dados com problemas de encoding
SELECT 
    id,
    nome,
    descricao,
    encode(nome::bytea, 'escape') as nome_bytes,
    encode(descricao::bytea, 'escape') as descricao_bytes
FROM categorias_amenidades 
WHERE nome LIKE '%Ã%' OR descricao LIKE '%Ã%';

SELECT 
    id,
    nome,
    descricao,
    encode(nome::bytea, 'escape') as nome_bytes,
    encode(descricao::bytea, 'escape') as descricao_bytes
FROM categorias_proximidades 
WHERE nome LIKE '%Ã%' OR descricao LIKE '%Ã%';

-- 4. Corrigir categorias de amenidades com problemas de encoding
UPDATE categorias_amenidades 
SET 
    nome = 'Esporte & Saúde',
    descricao = 'Atividades esportivas e de saúde'
WHERE nome LIKE '%Esporte & SaÃ°de%';

UPDATE categorias_amenidades 
SET 
    nome = 'Segurança',
    descricao = 'Recursos de segurança do imóvel'
WHERE nome LIKE '%SeguranÃ§a%';

UPDATE categorias_amenidades 
SET 
    nome = 'Conveniência & Serviços',
    descricao = 'Serviços de conveniência'
WHERE nome LIKE '%ConveniÃªncia & ServiÃ§os%';

UPDATE categorias_amenidades 
SET 
    nome = 'Públicos Especiais',
    descricao = 'Recursos para públicos especiais'
WHERE nome LIKE '%PÃºblicos Especiais%';

-- 5. Verificar se as correções foram aplicadas
SELECT id, nome, descricao FROM categorias_amenidades ORDER BY ordem;

-- 6. Verificar se ainda existem problemas
SELECT 
    id,
    nome,
    descricao
FROM categorias_amenidades 
WHERE nome LIKE '%Ã%' OR descricao LIKE '%Ã%';

SELECT 
    id,
    nome,
    descricao
FROM categorias_proximidades 
WHERE nome LIKE '%Ã%' OR descricao LIKE '%Ã%';



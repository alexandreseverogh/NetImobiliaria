-- Migration: Popular tabela valor_destaque_local com estados brasileiros
-- Data: 2025-01-XX
-- Descrição: Popula a tabela valor_destaque_local com todos os estados brasileiros

-- Lista de estados brasileiros (sigla e nome)
-- Baseado na lista de estados usada nos filtros do sistema

INSERT INTO valor_destaque_local (estado_fk, cidade_fk, valor_destaque, created_at, updated_at)
VALUES
    ('AC', 'TODAS', 0.00, NOW(), NOW()),
    ('AL', 'TODAS', 0.00, NOW(), NOW()),
    ('AP', 'TODAS', 0.00, NOW(), NOW()),
    ('AM', 'TODAS', 0.00, NOW(), NOW()),
    ('BA', 'TODAS', 0.00, NOW(), NOW()),
    ('CE', 'TODAS', 0.00, NOW(), NOW()),
    ('DF', 'TODAS', 0.00, NOW(), NOW()),
    ('ES', 'TODAS', 0.00, NOW(), NOW()),
    ('GO', 'TODAS', 0.00, NOW(), NOW()),
    ('MA', 'TODAS', 0.00, NOW(), NOW()),
    ('MT', 'TODAS', 0.00, NOW(), NOW()),
    ('MS', 'TODAS', 0.00, NOW(), NOW()),
    ('MG', 'TODAS', 0.00, NOW(), NOW()),
    ('PA', 'TODAS', 0.00, NOW(), NOW()),
    ('PB', 'TODAS', 0.00, NOW(), NOW()),
    ('PR', 'TODAS', 0.00, NOW(), NOW()),
    ('PE', 'TODAS', 0.00, NOW(), NOW()),
    ('PI', 'TODAS', 0.00, NOW(), NOW()),
    ('RJ', 'TODAS', 0.00, NOW(), NOW()),
    ('RN', 'TODAS', 0.00, NOW(), NOW()),
    ('RS', 'TODAS', 0.00, NOW(), NOW()),
    ('RO', 'TODAS', 0.00, NOW(), NOW()),
    ('RR', 'TODAS', 0.00, NOW(), NOW()),
    ('SC', 'TODAS', 0.00, NOW(), NOW()),
    ('SP', 'TODAS', 0.00, NOW(), NOW()),
    ('SE', 'TODAS', 0.00, NOW(), NOW()),
    ('TO', 'TODAS', 0.00, NOW(), NOW())
ON CONFLICT (estado_fk, cidade_fk) DO NOTHING;

-- Verificação
SELECT 
    estado_fk,
    COUNT(*) as total_registros,
    SUM(CASE WHEN cidade_fk = 'TODAS' THEN 1 ELSE 0 END) as registros_todas_cidades
FROM valor_destaque_local
GROUP BY estado_fk
ORDER BY estado_fk;

SELECT 
    'Total de estados populados:' as info,
    COUNT(DISTINCT estado_fk) as total_estados
FROM valor_destaque_local;


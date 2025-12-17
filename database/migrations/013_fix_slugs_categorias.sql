-- Migration: Corrigir slugs de categorias
-- Data: 29/10/2024
-- Descrição: Remove "de" dos slugs de categorias para consistência com código frontend

-- Backup dos valores antigos (para rollback se necessário)
-- categorias-de-amenidades → categorias-amenidades
-- categorias-de-funcionalidades → categorias-funcionalidades  
-- categorias-de-proximidades → categorias-proximidades

BEGIN;

-- 1. Atualizar slug de Categorias de Amenidades
UPDATE system_features 
SET slug = 'categorias-amenidades'
WHERE slug = 'categorias-de-amenidades';

-- 2. Atualizar slug de Categorias de Funcionalidades
UPDATE system_features 
SET slug = 'categorias-funcionalidades'
WHERE slug = 'categorias-de-funcionalidades';

-- 3. Atualizar slug de Categorias de Proximidades
UPDATE system_features 
SET slug = 'categorias-proximidades'
WHERE slug = 'categorias-de-proximidades';

-- Verificar alterações
SELECT id, name, slug 
FROM system_features 
WHERE name LIKE '%Categorias%'
ORDER BY slug;

COMMIT;

-- NOTA: As permissões e role_permissions permanecem intactas
-- pois usam feature_id, não slug




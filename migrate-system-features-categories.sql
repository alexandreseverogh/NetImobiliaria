-- ===========================================
-- MIGRAÇÃO: system_features category_id
-- GUARDIAN RULES - Migração Segura
-- ===========================================

BEGIN;

-- 1. BACKUP DA TABELA system_features
CREATE TABLE IF NOT EXISTS system_features_backup AS SELECT * FROM system_features;

-- 2. VERIFICAR CATEGORIAS DISPONÍVEIS
SELECT 'Categorias disponíveis:' as info, id, name, slug FROM system_categorias ORDER BY sort_order;

-- 3. ATUALIZAR category_id CONFORME MAPEAMENTO ESPECIFICADO
-- Categoria 1: Sistema
UPDATE system_features 
SET category_id = 1 
WHERE name IN (
    'Gestão de Categorias',
    'Funcionalidades do Sistema'
);

-- Categoria 2: Permissões  
UPDATE system_features 
SET category_id = 2 
WHERE name IN (
    'Hierarquia de Perfis',
    'Gestão de Perfis',
    'Configuração de Permissões'
);

-- Categoria 3: Administrativo
UPDATE system_features 
SET category_id = 3 
WHERE name IN (
    'Gestão de Usuários',
    'Gestão de Tipos de Documentos',
    'Gestão de Categorias de Amenidades',
    'Gestão de Amenidades',
    'Gestão de Categorias de Proximidades',
    'Gestão de Proximidades'
);

-- Categoria 4: Imóveis
UPDATE system_features 
SET category_id = 4 
WHERE name IN (
    'Gestão de Tipos de Imóveis',
    'Gestão de Finalidades',
    'Gestão de Status de Imóveis',
    'Mudança de Status',
    'Gestão de Imóveis'
);

-- Categoria 5: Clientes
UPDATE system_features 
SET category_id = 5 
WHERE name IN (
    'Gestão de Clientes'
);

-- Categoria 6: Proprietários
UPDATE system_features 
SET category_id = 6 
WHERE name IN (
    'Gestão de Proprietários'
);

-- Categoria 7: Dashboard / Relatórios
UPDATE system_features 
SET category_id = 7 
WHERE name IN (
    'Dashboards',
    'Relatório de Vendas'
);

-- 4. ATUALIZAR FK CONSTRAINT PARA system_categorias
-- Primeiro, remover constraint antiga se existir
ALTER TABLE system_features DROP CONSTRAINT IF EXISTS system_features_category_id_fkey;

-- Adicionar nova constraint para system_categorias
ALTER TABLE system_features 
ADD CONSTRAINT system_features_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES system_categorias(id);

-- 5. RECRIAR ÍNDICES OTIMIZADOS
-- Remover índices antigos
DROP INDEX IF EXISTS idx_system_features_category;

-- Criar novos índices
CREATE INDEX idx_system_features_category_id ON system_features (category_id);
CREATE INDEX idx_system_features_category_id_active ON system_features (category_id, is_active);

-- 6. RELATÓRIO DE MIGRAÇÃO
SELECT 
    'MIGRAÇÃO CONCLUÍDA' AS status,
    (SELECT COUNT(*) FROM system_features WHERE category_id IS NOT NULL) AS funcionalidades_atualizadas,
    (SELECT COUNT(*) FROM system_features_backup) AS backup_criado;

-- 7. VERIFICAR RESULTADO
SELECT 
    sf.name,
    sc.name as categoria_nome,
    sf.category_id,
    sc.slug as categoria_slug
FROM system_features sf
LEFT JOIN system_categorias sc ON sf.category_id = sc.id
ORDER BY sc.sort_order, sf.name;

COMMIT;


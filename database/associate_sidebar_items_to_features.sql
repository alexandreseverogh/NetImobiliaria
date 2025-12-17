-- ============================================================
-- ASSOCIAÇÃO DINÂMICA DE ITENS DA SIDEBAR ÀS FEATURES
-- ============================================================
-- OBJETIVO: Associar TODOS os itens da sidebar às features
-- específicas para controle de permissões 100% dinâmico
-- 
-- PRINCÍPIO: ZERO HARDCODING - tudo baseado em tabelas
-- ============================================================

-- ============================================================
-- 1. MAPEAMENTO DE ITENS DA SIDEBAR PARA FEATURES
-- ============================================================
-- Baseado na análise dos itens sem feature_id
-- ============================================================

-- Atualizar itens da sidebar com suas features correspondentes
UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'Usuários'
)
WHERE name = 'Usuários' AND feature_id IS NULL;

UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'Gestão de Perfis'
)
WHERE name = 'Perfis de Usuários' AND feature_id IS NULL;

UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'Gestão de permissões'
)
WHERE name = 'Configurar Permissões' AND feature_id IS NULL;

UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'Hierarquia de Perfis'
)
WHERE name = 'Hierarquia de Perfis' AND feature_id IS NULL;

UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'Imóveis'
)
WHERE name = 'Imóveis' AND feature_id IS NULL;

UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'Imóveis'
)
WHERE name = 'Cadastro' AND url = '/admin/imoveis' AND feature_id IS NULL;

UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'Proprietários'
)
WHERE name = 'Proprietários' AND feature_id IS NULL;

UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'Proprietários'
)
WHERE name = 'Cadastro' AND url = '/admin/proprietarios' AND feature_id IS NULL;

UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'Clientes'
)
WHERE name = 'Clientes' AND feature_id IS NULL;

UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'Clientes'
)
WHERE name = 'Cadastro' AND url = '/admin/clientes' AND feature_id IS NULL;

UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'Amenidades'
)
WHERE name = 'Amenidades' AND feature_id IS NULL;

UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'Amenidades'
)
WHERE name = 'Amenidades' AND url = '/admin/amenidades' AND feature_id IS NULL;

UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'Categorias de Amenidades'
)
WHERE name = 'Categorias' AND url = '/admin/categorias-amenidades' AND feature_id IS NULL;

UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'Categorias de Proximidades'
)
WHERE name = 'Categorias' AND url = '/admin/categorias-proximidades' AND feature_id IS NULL;

UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'Categorias de Funcionalidades'
)
WHERE name = 'Categorias de Funcionalidades' AND feature_id IS NULL;

UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'Proximidades'
)
WHERE name = 'Proximidades' AND feature_id IS NULL;

UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'Proximidades'
)
WHERE name = 'Proximidades' AND url = '/admin/proximidades' AND feature_id IS NULL;

UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'Finalidades de Imóveis'
)
WHERE name = 'Finalidades' AND feature_id IS NULL;

UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'Status de Imóveis'
)
WHERE name = 'Status' AND feature_id IS NULL;

UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'Mudança de Status'
)
WHERE name = 'Mudança de Status' AND feature_id IS NULL;

UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'Tipos de Imóveis'
)
WHERE name = 'Tipos' AND feature_id IS NULL;

UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'Tipos de Documentos'
)
WHERE name = 'Tipos de Documentos' AND feature_id IS NULL;

UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'Dashboard'
)
WHERE name = 'Dashboards' AND feature_id IS NULL;

UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'Relatórios'
)
WHERE name = 'Relatórios' AND feature_id IS NULL;

UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'Sessões'
)
WHERE name = 'Sessões Ativas' AND feature_id IS NULL;

UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'Auditoria de Logs do Sistema'
)
WHERE name = 'Logs do Sistema' AND feature_id IS NULL;

UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'Configuração da Sidebar'
)
WHERE name = 'Configuração da Sidebar' AND feature_id IS NULL;

UPDATE sidebar_menu_items 
SET feature_id = (
    SELECT id FROM system_features 
    WHERE name = 'funcionalidades do sistema'
)
WHERE name = 'Funcionalidades do Sistema' AND feature_id IS NULL;

-- ============================================================
-- 2. VERIFICAÇÃO DOS RESULTADOS
-- ============================================================
-- Verificar quantos itens ainda não têm feature_id
-- ============================================================

SELECT 
    COUNT(*) as total_items,
    COUNT(CASE WHEN feature_id IS NULL THEN 1 END) as items_without_feature,
    COUNT(CASE WHEN feature_id IS NOT NULL THEN 1 END) as items_with_feature
FROM sidebar_menu_items 
WHERE is_active = true;

-- ============================================================
-- 3. LISTAR ITENS QUE AINDA PRECISAM DE FEATURE_ID
-- ============================================================
-- Para identificar itens que precisam de mapeamento manual
-- ============================================================

SELECT 
    id,
    name,
    url,
    parent_id,
    CASE 
        WHEN parent_id IS NULL THEN 'MENU PAI'
        ELSE 'SUBMENU'
    END as tipo
FROM sidebar_menu_items 
WHERE is_active = true 
AND feature_id IS NULL
ORDER BY parent_id NULLS FIRST, order_index;

-- ============================================================
-- 4. PRÓXIMOS PASSOS
-- ============================================================
-- 1. Executar este script
-- 2. Verificar itens restantes sem feature_id
-- 3. Mapear manualmente os itens restantes
-- 4. Testar com usuários de diferentes níveis
-- ============================================================

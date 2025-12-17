-- ============================================================
-- REMOVER "GESTÃO DE PERFIS" DA SIDEBAR
-- Manter apenas "Gestão de Roles"
-- ============================================================

-- 1. VERIFICAR ITENS ATUAIS DA SIDEBAR - PAINEL ADMINISTRATIVO
SELECT 
    id,
    name,
    url,
    resource,
    parent_id
FROM sidebar_menu_items 
WHERE name IN ('Gestão de Perfis', 'Roles')
   OR parent_id = (SELECT id FROM sidebar_menu_items WHERE name = 'Painel Administrativo')
ORDER BY order_index;

-- 2. DELETAR "GESTÃO DE PERFIS" (se existir)
DELETE FROM sidebar_menu_items 
WHERE name = 'Gestão de Perfis' 
  AND parent_id = (SELECT id FROM sidebar_menu_items WHERE name = 'Painel Administrativo');

-- 3. VERIFICAR SE "ROLES" JÁ EXISTE
SELECT id, name, url 
FROM sidebar_menu_items 
WHERE name = 'Roles'
  AND parent_id = (SELECT id FROM sidebar_menu_items WHERE name = 'Painel Administrativo');

-- 4. ADICIONAR "ROLES" (se não existir)
-- Buscar o parent_id do "Painel Administrativo"
INSERT INTO sidebar_menu_items (
    parent_id,
    name, 
    icon_name, 
    url, 
    resource, 
    order_index, 
    is_active, 
    roles_required,
    description
) 
SELECT 
    pai.id as parent_id,
    'Roles',
    'shield',
    '/admin/roles',
    'roles',
    2,  -- Order 2 (após Hierarquia de Perfis)
    true,
    '["Super Admin", "Administrador"]'::jsonb,
    'Gestão de perfis e hierarquias'
FROM sidebar_menu_items pai
WHERE pai.name = 'Painel Administrativo'
  AND NOT EXISTS (
      SELECT 1 FROM sidebar_menu_items 
      WHERE name = 'Roles' 
        AND parent_id = pai.id
  );

-- 5. ATUALIZAR ORDER_INDEX DOS ITENS RESTANTES
UPDATE sidebar_menu_items 
SET order_index = 2 
WHERE name = 'Roles'
  AND parent_id = (SELECT id FROM sidebar_menu_items WHERE name = 'Painel Administrativo');

UPDATE sidebar_menu_items 
SET order_index = 3 
WHERE name = 'Configurar Permissões'
  AND parent_id = (SELECT id FROM sidebar_menu_items WHERE name = 'Painel Administrativo');

UPDATE sidebar_menu_items 
SET order_index = 4 
WHERE name = 'Usuários'
  AND parent_id = (SELECT id FROM sidebar_menu_items WHERE name = 'Painel Administrativo');

UPDATE sidebar_menu_items 
SET order_index = 5 
WHERE name = 'Tipos de Documentos'
  AND parent_id = (SELECT id FROM sidebar_menu_items WHERE name = 'Painel Administrativo');

-- 6. VERIFICAR RESULTADO FINAL
SELECT 
    id,
    name,
    url,
    resource,
    order_index,
    parent_id
FROM sidebar_menu_items 
WHERE parent_id = (SELECT id FROM sidebar_menu_items WHERE name = 'Painel Administrativo')
ORDER BY order_index;

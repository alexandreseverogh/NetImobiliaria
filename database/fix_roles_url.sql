-- ============================================================
-- CORRIGIR URL DE "GESTÃO DE PERFIS"
-- Data: 27/10/2025
-- Problema: URL estava como /admin/perfis mas deveria ser /admin/roles
-- ============================================================

UPDATE sidebar_menu_items 
SET url = '/admin/roles' 
WHERE name = 'Gestão de Perfis' 
  AND url = '/admin/perfis';

-- Verificar a correção
SELECT 
    id,
    name,
    url,
    resource,
    parent_id
FROM sidebar_menu_items 
WHERE name = 'Gestão de Perfis';

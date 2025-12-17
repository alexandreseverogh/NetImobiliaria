-- ============================================================
-- TESTE SIMULADO DA API DE CATEGORIAS
-- ============================================================
-- Objetivo: Simular o que a API deveria retornar
-- ============================================================

-- Simular a query da API /api/admin/categorias
SELECT 
    c.id,
    c.name,
    c.slug,
    c.description,
    c.icon,
    c.color,
    c.sort_order,
    c.is_active,
    c.created_at,
    c.updated_at,
    c.created_by,
    c.updated_by
FROM system_categorias c
WHERE c.is_active = true
ORDER BY c.sort_order ASC, c.name ASC;

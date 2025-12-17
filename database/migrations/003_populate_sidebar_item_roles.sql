-- Popular sidebar_item_roles baseado em roles_required

-- Corrigir dados inconsistentes primeiro
UPDATE sidebar_menu_items 
SET roles_required = '[]'::jsonb 
WHERE jsonb_typeof(roles_required) = 'string';

-- Popular tabela M:N
INSERT INTO sidebar_item_roles (sidebar_item_id, role_id)
SELECT 
    smi.id,
    ur.id
FROM sidebar_menu_items smi
CROSS JOIN LATERAL jsonb_array_elements_text(smi.roles_required) AS role_name
JOIN user_roles ur ON ur.name = role_name::text
WHERE jsonb_typeof(smi.roles_required) = 'array'
ON CONFLICT (sidebar_item_id, role_id) DO NOTHING;

-- Verificação
SELECT 
    'Dados migrados' as status,
    COUNT(*) as total_associacoes
FROM sidebar_item_roles;

-- Mostrar resultado
SELECT 
    smi.name,
    STRING_AGG(ur.name, ', ') as perfis_permitidos
FROM sidebar_menu_items smi
LEFT JOIN sidebar_item_roles sir ON smi.id = sir.sidebar_item_id
LEFT JOIN user_roles ur ON sir.role_id = ur.id
GROUP BY smi.id, smi.name
ORDER BY smi.order_index
LIMIT 10;




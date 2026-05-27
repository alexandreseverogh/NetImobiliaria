BEGIN;
UPDATE sidebar_menu_items SET order_index = order_index + 1 WHERE parent_id = 83 AND order_index >= 2;
INSERT INTO sidebar_menu_items (parent_id, name, icon_name, url, order_index, is_active, roles_required) 
VALUES (83, 'Gestão de Módulos', 'Squares2X2Icon', '/admin/master/modules', 2, true, '["Super Admin"]');
COMMIT;

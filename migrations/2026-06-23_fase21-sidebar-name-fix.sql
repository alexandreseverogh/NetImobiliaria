-- Fix sidebar item name encoding
UPDATE public.sidebar_menu_items
SET name = 'Aprovações do Agente'
WHERE id = 121;

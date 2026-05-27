-- Auditoria de Slugs para Módulos e Features do CRM
SELECT slug, name, 'MODULO' as tipo FROM public.system_modules WHERE slug = 'crm' OR name ILIKE '%CRM%';
SELECT slug, name, 'FEATURE' as tipo FROM public.system_features WHERE slug ILIKE '%crm%' OR name ILIKE '%crm%' OR slug ILIKE '%leads%' OR slug ILIKE '%kanban%';

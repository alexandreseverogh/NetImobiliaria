-- Mapear Slugs do CRM e suas Funcionalidades
SELECT slug, name, 'MODULO' as tipo FROM public.system_modules WHERE name ILIKE '%CRM%' OR slug ILIKE '%crm%';
SELECT slug, name, 'FEATURE' as tipo FROM public.system_features WHERE name ILIKE '%CRM%' OR slug ILIKE '%crm%';
SELECT id, name, slug FROM public.system_segments WHERE name ILIKE '%Imobiliário%';

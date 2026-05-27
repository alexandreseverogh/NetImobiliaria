-- Mapear Slugs Master
SELECT slug, name, 'SEGMENTO' as tipo FROM public.system_segments WHERE name ILIKE '%Imobiliário%';
SELECT slug, name, 'MODULO' as tipo FROM public.system_modules WHERE name ILIKE '%CRM%';
SELECT slug, name, 'FEATURE' as tipo FROM public.system_features WHERE name ILIKE '%CRM%' OR slug ILIKE '%crm%';

-- 1. Verificar se o Módulo CRM existe e a que segmentos ele está ligado
SELECT m.id, m.name, m.slug, s.name as segment_name
FROM public.system_modules m
LEFT JOIN public.system_segment_modules sm ON m.id = sm.module_id
LEFT JOIN public.system_segments s ON sm.segment_id = s.id
WHERE m.name ILIKE '%CRM%';

-- 2. Verificar se existem funcionalidades do CRM e se estão ligadas a algum módulo
SELECT f.id, f.name, f.slug, m.name as module_name
FROM public.system_features f
LEFT JOIN public.system_feature_modules fm ON f.id = fm.feature_id
LEFT JOIN public.system_modules m ON fm.module_id = m.id
WHERE f.name ILIKE '%CRM%' OR f.slug ILIKE '%crm%';

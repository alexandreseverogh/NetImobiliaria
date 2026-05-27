-- 1. Vincular Módulo CRM ao Segmento Imobiliário
INSERT INTO public.system_segment_modules (segment_id, module_id)
SELECT s.id, m.id 
FROM public.system_segments s, public.system_modules m 
WHERE s.slug = 'imobiliaria' AND m.slug = 'crm'
ON CONFLICT DO NOTHING;

-- 2. Vincular Funcionalidades do CRM ao Módulo CRM
INSERT INTO public.system_feature_modules (module_id, feature_id)
SELECT m.id, f.id 
FROM public.system_modules m, public.system_features f 
WHERE m.slug = 'crm' AND f.slug LIKE 'crm-%'
ON CONFLICT DO NOTHING;

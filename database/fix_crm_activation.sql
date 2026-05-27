-- 1. Vincular Módulo CRM ao Segmento Imobiliário
INSERT INTO public.system_segment_modules (segment_id, module_id)
SELECT id, (SELECT id FROM public.system_modules WHERE slug = 'crm' LIMIT 1)
FROM public.system_segments 
WHERE slug = 'imobiliario'
ON CONFLICT DO NOTHING;

-- 2. Vincular Funcionalidades do CRM ao Módulo CRM
INSERT INTO public.system_feature_modules (module_id, feature_id)
SELECT (SELECT id FROM public.system_modules WHERE slug = 'crm' LIMIT 1), id
FROM public.system_features 
WHERE slug IN ('crm-dashboard', 'leads-manager', 'kanban-leads', 'pipeline')
ON CONFLICT DO NOTHING;

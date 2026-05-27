-- Lista de funcionalidades sem módulo (Órfãs)
SELECT id, name, slug FROM public.system_features f 
WHERE NOT EXISTS (SELECT 1 FROM public.system_feature_modules fm WHERE fm.feature_id = f.id);

-- Lista de módulos sem segmento (Órfãos)
SELECT id, name, slug FROM public.system_modules m 
WHERE NOT EXISTS (SELECT 1 FROM public.system_segment_modules sm WHERE sm.module_id = m.id);

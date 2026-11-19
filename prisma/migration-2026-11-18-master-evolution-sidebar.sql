-- Registra a tela "Servidores WhatsApp (Evolution)" no menu do Master, na mesma categoria da
-- "IA da Plataforma". Idempotente.
INSERT INTO public.system_features (name, slug, url, category_id, sort_order, is_active)
SELECT 'Servidores WhatsApp', 'master-evolution-servers', '/admin/master/evolution', f.category_id, 1, true
  FROM public.system_features f
 WHERE f.slug = 'master-ia-plataforma'
   AND NOT EXISTS (SELECT 1 FROM public.system_features WHERE slug = 'master-evolution-servers');

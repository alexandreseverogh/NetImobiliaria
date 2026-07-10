-- Adiciona a relation "fotos" (links reais de imovel_imagens.url_cdn) à entidade "imovel"
-- do segmento Imobiliário, complementando "qtd_fotos" (contagem) já existente.
-- Idempotente: remove uma "fotos" antiga (se houver) antes de inserir, preserva as demais relations.

UPDATE mensageria.segment_data_entities
SET relations = (
  SELECT jsonb_agg(r) FROM jsonb_array_elements(relations) r
  WHERE r->>'name' <> 'fotos'
) || jsonb_build_array(jsonb_build_object(
  'name', 'fotos',
  'description', 'Links das fotos do imóvel (quando disponíveis via CDN)',
  'bridge_table', 'imovel_imagens',
  'bridge_fk', 'imovel_id',
  'select_column', 'url_cdn',
  'agg', 'array',
  'max', 4
))
WHERE entity_name = 'imovel'
  AND tenant_id IS NULL;

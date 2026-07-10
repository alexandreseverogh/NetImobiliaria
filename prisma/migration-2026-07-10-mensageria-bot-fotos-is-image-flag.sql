-- Marca a relation "fotos" (entidade imovel) com is_image=true — o bot passou a decidir quais
-- relations viram mensagem de imagem de verdade pelo config (qualquer relation is_image=true de
-- qualquer entidade/segmento), não mais pelo nome literal "fotos" hardcoded no código.

UPDATE mensageria.segment_data_entities
SET relations = (
  SELECT jsonb_agg(
    CASE WHEN r->>'name' = 'fotos' THEN r || jsonb_build_object('is_image', true) ELSE r END
  )
  FROM jsonb_array_elements(relations) r
)
WHERE entity_name = 'imovel'
  AND tenant_id IS NULL;

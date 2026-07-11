-- Marca a coluna "titulo" (entidade imovel) como is_group_header=true — é o cabeçalho/rótulo
-- do item usado quando o bot agrupa vários resultados em cartões. Genérico: qualquer segmento
-- marca sua coluna de rótulo (nome da clínica, modelo do carro, etc.) via o checkbox "cabeçalho".

UPDATE mensageria.segment_data_entities
SET columns = (
  SELECT jsonb_agg(
    CASE WHEN c->>'name' = 'titulo' THEN c || jsonb_build_object('is_group_header', true) ELSE c END
  )
  FROM jsonb_array_elements(columns) c
)
WHERE entity_name = 'imovel'
  AND tenant_id IS NULL;

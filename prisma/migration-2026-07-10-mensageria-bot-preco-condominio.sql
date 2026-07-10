-- Expõe preco_condominio ao bot (segmento Imobiliário) — estava cadastrado mas com
-- selectable=false, então o bot nunca via o valor pra responder sobre condomínio.

UPDATE mensageria.segment_data_entities
SET columns = (
  SELECT jsonb_agg(
    CASE WHEN c->>'name' = 'preco_condominio'
      THEN c || jsonb_build_object('selectable', true, 'description', 'Valor do condomínio em reais')
      ELSE c
    END
  )
  FROM jsonb_array_elements(columns) c
)
WHERE entity_name = 'imovel'
  AND tenant_id IS NULL;

-- Nova flag `is_groupable`: marca colunas que servem de dimensão pra agrupar e contar
-- (ferramenta agrupar_<entidade>, auto-gerada pra qualquer entidade com ≥1 coluna assim marcada).
-- Resolve perguntas exploratórias tipo "em quais bairros vocês têm imóveis" cobrindo 100% das
-- categorias reais, diferente de buscar_<entidade> (que só traz uma amostra de max_rows itens
-- e pode nunca tocar em bairros com poucos registros).

UPDATE mensageria.segment_data_entities
SET columns = (
  SELECT jsonb_agg(
    CASE WHEN c->>'name' = 'bairro'
      THEN c || jsonb_build_object('is_groupable', true)
      ELSE c
    END
  )
  FROM jsonb_array_elements(columns) c
)
WHERE entity_name = 'imovel'
  AND tenant_id IS NULL;

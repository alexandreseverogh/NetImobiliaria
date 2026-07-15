-- Nova flag explícita `is_comparable` (mesmo padrão de is_image/is_group_header): marca quais
-- colunas numéricas são VALORES/quantidades de negócio elegíveis pra soma/comparação na
-- ferramenta comparar_<entidade>. Antes desta migração, QUALQUER coluna numérica selecionável
-- virava elegível automaticamente por inferência de tipo — o que incluía a PK (`id`) e campos de
-- posição/rótulo (`andar`) numa "salada" sem sentido de negócio (ex.: somar andar + vagas de
-- garagem). Curadoria deliberada: marca como comparável os 7 campos que fazem sentido individual
-- ("qual tem mais quartos") ou somado (preço + condomínio + IPTU) — deixa `andar` e `id` de fora
-- (id já é excluído estruturalmente pelo código via identity_column, mesmo sem a flag).

UPDATE mensageria.segment_data_entities
SET columns = (
  SELECT jsonb_agg(
    CASE WHEN c->>'name' IN ('preco', 'preco_condominio', 'preco_iptu', 'quartos', 'banheiros', 'vagas_garagem', 'area_total')
      THEN c || jsonb_build_object('is_comparable', true)
      ELSE c
    END
  )
  FROM jsonb_array_elements(columns) c
)
WHERE entity_name = 'imovel'
  AND tenant_id IS NULL;

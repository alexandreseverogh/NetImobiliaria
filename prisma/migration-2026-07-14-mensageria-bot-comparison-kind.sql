-- Nova flag `comparison_kind` ('moeda' | 'quantidade') em colunas já marcadas is_comparable=true.
-- Resolve um risco real apontado pelo usuário: is_comparable sozinho não impedia o bot de somar
-- campos que não deveriam ser combinados (ex.: preco + quartos). Regra: só campos "moeda" podem
-- ser somados/subtraídos/tirados a média entre si (ex.: preco + preco_condominio + preco_iptu =
-- custo total, uma pergunta real de negócio); campos "quantidade" só são comparados um de cada
-- vez ("qual tem mais quartos"), nunca combinados com outro campo — nem entre si, nem com dinheiro.
-- 'quantidade' é o default seguro quando o campo não tem a flag (ver isComparableNumericColumn).

UPDATE mensageria.segment_data_entities
SET columns = (
  SELECT jsonb_agg(
    CASE
      WHEN c->>'name' IN ('preco', 'preco_condominio', 'preco_iptu')
        THEN c || jsonb_build_object('comparison_kind', 'moeda')
      WHEN c->>'name' IN ('quartos', 'banheiros', 'vagas_garagem', 'area_total')
        THEN c || jsonb_build_object('comparison_kind', 'quantidade')
      ELSE c
    END
  )
  FROM jsonb_array_elements(columns) c
)
WHERE entity_name = 'imovel'
  AND tenant_id IS NULL;

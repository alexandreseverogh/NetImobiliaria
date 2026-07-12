-- Ativa o lookup de chave estrangeira nas 3 colunas de classificação do imóvel que um visitante
-- naturalmente pergunta por nome (tipo, status, finalidade). Antes, essas colunas ficavam de fora
-- (selectable/filterable=false) — o bot não tinha como filtrar/exibir por nome, só pelo id numérico
-- cru, que o LLM nunca sabe de cabeça. Sem filtro real, uma pergunta por tipo específico (ex.:
-- "bangalô") virava um bairro-only match que o LLM rotulava incorretamente como se fosse do tipo
-- perguntado — bug real reportado pelo usuário.
--
-- Tabelas de lookup confirmadas via \d: tipos_imovel(id,nome), status_imovel(id,nome),
-- finalidades_imovel(id,nome) — nota: a tabela é "finalidades_imovel", não "finalidades".

UPDATE mensageria.segment_data_entities
SET columns = (
  SELECT jsonb_agg(
    CASE
      WHEN c->>'name' = 'tipo_fk' THEN c || jsonb_build_object(
        'selectable', true, 'filterable', true,
        'description', 'Tipo do imóvel — ex.: apartamento, casa, cobertura, bangalô, terreno',
        'lookup_table', 'tipos_imovel', 'lookup_pk', 'id', 'lookup_label_column', 'nome'
      )
      WHEN c->>'name' = 'status_fk' THEN c || jsonb_build_object(
        'selectable', true, 'filterable', true,
        'description', 'Situação/status do imóvel — ex.: disponível, reservado, vendido, alugado',
        'lookup_table', 'status_imovel', 'lookup_pk', 'id', 'lookup_label_column', 'nome'
      )
      WHEN c->>'name' = 'finalidade_fk' THEN c || jsonb_build_object(
        'selectable', true, 'filterable', true,
        'description', 'Finalidade do imóvel — ex.: venda, locação/aluguel',
        'lookup_table', 'finalidades_imovel', 'lookup_pk', 'id', 'lookup_label_column', 'nome'
      )
      ELSE c
    END
  )
  FROM jsonb_array_elements(columns) c
)
WHERE entity_name = 'imovel'
  AND tenant_id IS NULL;

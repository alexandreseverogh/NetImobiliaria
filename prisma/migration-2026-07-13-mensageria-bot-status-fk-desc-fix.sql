-- Bug real: a descrição de status_fk (escrita por mim, sem checar o catálogo real do tenant)
-- usava "disponível" como exemplo — mas o valor real cadastrado é "Ativo" (status_imovel.nome),
-- não "Disponível". Como "disponível" é uma palavra genérica que qualquer visitante usa
-- naturalmente ("tem imóveis disponíveis?"), o LLM aplicava esse filtro, a subquery de lookup
-- não encontrava nenhum status com esse nome, e a busca voltava vazia de verdade — mesmo
-- havendo 12 imóveis ativos reais. Corrige a descrição pra não sugerir um exemplo que não existe
-- e para instruir o LLM a só usar esse filtro quando o visitante citar uma situação ESPECÍFICA/
-- incomum — não pra palavras genéricas de disponibilidade geral (já cobertas pelo default_filter
-- "ativo = true" da entidade, sem precisar de filtro nenhum).

UPDATE mensageria.segment_data_entities
SET columns = (
  SELECT jsonb_agg(
    CASE WHEN c->>'name' = 'status_fk' THEN c || jsonb_build_object(
      'description', 'Situação/status do imóvel — use SOMENTE se o visitante mencionar uma situação específica e incomum (ex.: reservado, vendido, alugado, em negociação). NÃO use para palavras genéricas como "disponível" ou "à venda" — os imóveis ativos já aparecem normalmente sem precisar deste filtro.'
    ) ELSE c END
  )
  FROM jsonb_array_elements(columns) c
)
WHERE entity_name = 'imovel'
  AND tenant_id IS NULL;

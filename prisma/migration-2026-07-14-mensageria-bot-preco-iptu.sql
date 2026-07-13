-- Achado crítico: preco_iptu estava com selectable=false — o bot NUNCA teve acesso real a esse
-- campo, mas vinha respondendo com valores de IPTU específicos (com falsa precisão) em toda a
-- sessão, incluindo o relato original do bug de comparação. Confirmado via dado real: imóvel 1
-- tem preco_iptu=2200.00, mas o bot uma vez disse "R$ 1.100,00" — inventado, não just estimado.
-- Mesmo padrão do fix de preco_condominio (sessão anterior).

UPDATE mensageria.segment_data_entities
SET columns = (
  SELECT jsonb_agg(
    CASE WHEN c->>'name' = 'preco_iptu'
      THEN c || jsonb_build_object('selectable', true, 'description', 'Valor do IPTU em reais')
      ELSE c
    END
  )
  FROM jsonb_array_elements(columns) c
)
WHERE entity_name = 'imovel'
  AND tenant_id IS NULL;

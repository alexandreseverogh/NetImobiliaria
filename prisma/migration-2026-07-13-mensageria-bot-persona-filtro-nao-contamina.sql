-- Bug reportado: numa conversa real, o visitante perguntou sobre "consórcio" (assunto sem
-- relação com critério de busca de imóvel) e, no turno seguinte, perguntou "em quais bairros tem
-- imóveis?" — o bot respondeu que não encontrou nada, mesmo havendo imóveis reais cadastrados em
-- vários bairros. Não foi possível reproduzir de forma determinística (5/5 tentativas isoladas
-- funcionaram corretamente) — indício de que o LLM ocasionalmente reaproveita um critério de um
-- assunto anterior não relacionado ao montar o filtro da ferramenta. Reforça a regra: só filtrar
-- pelo que a pergunta ATUAL pede, e perguntas genéricas/exploratórias devem ir sem filtro nenhum.

UPDATE public.system_prompt_templates
SET content = content || E'\n- Ao chamar a ferramenta de consulta, use APENAS os critérios que a pergunta ATUAL do visitante pede — nunca reaproveite um valor de bairro/tipo/preço/etc. de um assunto anterior da conversa que não tenha relação direta com a pergunta de agora (ex.: se o visitante mudou de assunto e depois faz uma pergunta genérica, não herde nenhum filtro do que foi dito antes). Para perguntas genéricas ou exploratórias (ex.: "quais bairros vocês têm imóveis", "quais tipos de imóveis vocês têm"), chame a ferramenta SEM nenhum filtro, pra trazer uma amostra real — nunca invente um filtro só porque a conversa tocou nesse assunto antes.'
WHERE id = '25299845-3245-4d5b-96b8-dac5343f3e31';

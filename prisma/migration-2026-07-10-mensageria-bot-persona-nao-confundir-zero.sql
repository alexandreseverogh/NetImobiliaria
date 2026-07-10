-- Reforça a distinção entre "não tenho essa informação" (campo não mapeado) e "a resposta é
-- zero/nenhum" (campo mapeado com valor real 0) — o bot testou dizendo "o imóvel não possui
-- suítes" pra um campo não mapeado, confundindo ausência de dado com valor zero.

UPDATE public.system_prompt_templates
SET content = REPLACE(
  content,
  'Se o visitante pedir um dado específico que não veio no resultado da ferramenta de consulta (um campo que a empresa ainda não disponibilizou pra você), diga claramente que não tem essa informação disponível no momento e incentive o visitante a falar com um atendente humano pra esse detalhe — nunca invente o valor nem ignore a pergunta silenciosamente.',
  'Se o visitante pedir um dado específico que não veio no resultado da ferramenta de consulta (um campo que a empresa ainda não disponibilizou pra você), diga claramente que não tem essa informação disponível no momento e incentive o visitante a falar com um atendente humano pra esse detalhe — nunca invente o valor nem ignore a pergunta silenciosamente. IMPORTANTE: "não tenho essa informação disponível" é diferente de "a resposta é zero/nenhum" — nunca diga que um imóvel "não possui" ou "não tem" algo (dando a entender resposta zero) quando na verdade o campo simplesmente não veio nos dados; nesse caso, deixe claro que é a INFORMAÇÃO que está indisponível, não que o imóvel não tenha aquele atributo.'
)
WHERE id = '25299845-3245-4d5b-96b8-dac5343f3e31';

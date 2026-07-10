-- Ajuste: o bot estava colando o link cru da foto no texto, além de já mandar a foto como
-- mensagem de imagem separada (redundante). Reforça: nunca escrever a URL na resposta em texto,
-- a plataforma já envia a foto como imagem de verdade.

UPDATE public.system_prompt_templates
SET content = REPLACE(
  content,
  'Ao apresentar fotos de um imóvel, use a ferramenta de consulta e envie apenas os links de foto que vierem preenchidos na resposta — ignore silenciosamente qualquer entrada vazia/nula da lista, sem comentar ou avisar sobre isso. Se nenhum link vier preenchido, diga que não há fotos disponíveis no momento, sem inventar.',
  'Ao apresentar fotos de um imóvel, use a ferramenta de consulta. NUNCA escreva a URL/link da foto na sua resposta em texto — a plataforma já envia a foto de verdade como imagem separada logo em seguida. Na sua resposta em texto, só comente algo natural como "Aqui estão as fotos!" (sem o link). Ignore silenciosamente qualquer entrada vazia/nula da lista de fotos, sem comentar ou avisar sobre isso. Se nenhum link vier preenchido, diga que não há fotos disponíveis no momento, sem inventar.'
)
WHERE id = '25299845-3245-4d5b-96b8-dac5343f3e31';

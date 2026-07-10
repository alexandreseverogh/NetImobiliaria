-- Reforça a regra de fotos pro caso de LISTA (vários imóveis na mesma resposta) — a resposta
-- textual não deve virar um item "Fotos: ..." repetido por imóvel; deve ser uma frase única e
-- natural, e só quando de fato existir alguma foto entre os imóveis apresentados.

UPDATE public.system_prompt_templates
SET content = REPLACE(
  content,
  'Ao apresentar fotos de um imóvel, use a ferramenta de consulta. NUNCA escreva a URL/link da foto na sua resposta em texto — a plataforma já envia a foto de verdade como imagem separada logo em seguida. Na sua resposta em texto, só comente algo natural como "Aqui estão as fotos!" (sem o link). Ignore silenciosamente qualquer entrada vazia/nula da lista de fotos, sem comentar ou avisar sobre isso. Se nenhum link vier preenchido, diga que não há fotos disponíveis no momento, sem inventar.',
  'Ao apresentar fotos, use a ferramenta de consulta. NUNCA escreva a URL/link da foto na sua resposta em texto — quando uma foto de verdade existir, a plataforma já envia ela como imagem separada logo em seguida. Ao listar VÁRIOS imóveis de uma vez, NÃO crie uma linha "Fotos:" repetida por imóvel nem repita frases genéricas item a item — escreva uma única frase natural no fim, mencionando fotos só se pelo menos um imóvel da lista realmente tiver foto disponível. Se NENHUM imóvel apresentado tiver foto disponível, diga isso uma única vez, de forma natural (ex.: "no momento não tenho fotos desses imóveis disponíveis"), sem inventar e sem repetir por item.'
)
WHERE id = '25299845-3245-4d5b-96b8-dac5343f3e31';

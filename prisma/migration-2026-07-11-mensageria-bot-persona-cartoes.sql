-- Ajusta a persona (segmento Imobiliário) para o novo agrupamento por cartão: o agrupamento
-- de vários itens com fotos agora é feito automaticamente pela plataforma (cabeçalho + info +
-- fotos por item), então o LLM não precisa (nem deve) montar isso no texto nem colar links.
-- A regra de agrupar no texto continua valendo para respostas multi-item SEM foto.

UPDATE public.system_prompt_templates
SET content = REPLACE(
  content,
  'Ao apresentar fotos, use a ferramenta de consulta. NUNCA escreva a URL/link da foto na sua resposta em texto — quando uma foto de verdade existir, a plataforma já envia ela como imagem separada logo em seguida. Ao listar VÁRIOS imóveis de uma vez, NÃO crie uma linha "Fotos:" repetida por imóvel nem repita frases genéricas item a item — escreva uma única frase natural no fim, mencionando fotos só se pelo menos um imóvel da lista realmente tiver foto disponível. Se NENHUM imóvel apresentado tiver foto disponível, diga isso uma única vez, de forma natural (ex.: "no momento não tenho fotos desses imóveis disponíveis"), sem inventar e sem repetir por item. Se a sua resposta abranger informações de mais de um imóvel, agrupe sempre as informações por imóvel, com um cabeçalho para cada imóvel e um separador entre os imóveis.',
  'Ao apresentar imóveis, use a ferramenta de consulta. Você NUNCA recebe nem escreve URLs/links de foto — quando um imóvel tem foto, a própria plataforma envia a imagem automaticamente. Quando a resposta abranger VÁRIOS imóveis e houver fotos, a plataforma já monta automaticamente um cartão por imóvel (cabeçalho + informações + fotos daquele imóvel) — então NÃO tente montar isso no texto, não repita "Fotos:" por item e não descreva as imagens. Se NENHUM imóvel tiver foto disponível, diga isso uma única vez, de forma natural, sem inventar. Para respostas que abranjam vários imóveis SEM foto, aí sim agrupe as informações por imóvel no texto, com um cabeçalho para cada imóvel e um separador entre eles.'
)
WHERE id = '25299845-3245-4d5b-96b8-dac5343f3e31';

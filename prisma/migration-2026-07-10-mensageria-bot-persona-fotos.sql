-- Reforça a persona do bot (segmento Imobiliário) com instrução sobre a nova relation "fotos":
-- ignorar silenciosamente links vazios/nulos (nem todo imóvel tem foto migrada para CDN).

UPDATE public.system_prompt_templates
SET content = content || E'\n- Ao apresentar fotos de um imóvel, use a ferramenta de consulta e envie apenas os links de foto que vierem preenchidos na resposta — ignore silenciosamente qualquer entrada vazia/nula da lista, sem comentar ou avisar sobre isso. Se nenhum link vier preenchido, diga que não há fotos disponíveis no momento, sem inventar.'
WHERE id = '25299845-3245-4d5b-96b8-dac5343f3e31'
  AND content NOT LIKE '%Ao apresentar fotos de um imóvel%';

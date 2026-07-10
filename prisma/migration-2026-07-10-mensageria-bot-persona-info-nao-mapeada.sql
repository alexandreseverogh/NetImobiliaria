-- Regra genérica: se o visitante pede um dado específico que a ferramenta de consulta não traz
-- (campo não mapeado/não selecionável), o bot deve dizer claramente que não tem essa informação
-- disponível e incentivar contato com um atendente — em vez de ignorar a pergunta ou responder
-- parcialmente sem admitir a lacuna. Aplicada nos dois templates ativos (fallback global +
-- especialização do segmento Imobiliário).

UPDATE public.system_prompt_templates
SET content = content || E'\n- Se o visitante pedir um dado específico que não veio no resultado da ferramenta de consulta (um campo que a empresa ainda não disponibilizou pra você), diga claramente que não tem essa informação disponível no momento e incentive o visitante a falar com um atendente humano pra esse detalhe — nunca invente o valor nem ignore a pergunta silenciosamente.'
WHERE id IN ('be5d2dac-8ea8-4891-8c36-aaaf1b8b179f', '25299845-3245-4d5b-96b8-dac5343f3e31')
  AND content NOT LIKE '%que não tem essa informação disponível no momento%';

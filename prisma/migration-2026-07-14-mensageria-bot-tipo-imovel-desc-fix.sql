-- Bug real: perguntado "voce tem o estatudo de imoveis?" (sem relação real com nenhum dado
-- mapeado), o bot chamou a ferramenta tipo_imovel e respondeu com a lista de tipos (Casa,
-- Apartamento, etc.) — resposta real, mas que não tinha nada a ver com a pergunta. Causa
-- provável: a descrição anterior ("use para responder o que a empresa oferece") é ampla/genérica
-- demais e pesa na decisão de tool-calling do LLM tanto quanto (ou mais que) o texto da persona.
-- Reescrita pra ser mais restritiva e incluir um contraexemplo explícito do tipo de engano
-- observado — mesma lição de sessões anteriores: instrução vaga tem baixa adesão, sinal
-- explícito/concreto funciona melhor.

UPDATE mensageria.segment_data_entities
SET description = 'Tipos/categorias de imóvel que a empresa trabalha (Casa, Apartamento, Terreno, etc.). Use SOMENTE quando o visitante perguntar explicitamente quais tipos ou categorias de imóvel existem (ex.: "quais tipos de imóvel vocês têm", "vocês trabalham com casa ou apartamento?"). NÃO use para perguntas sobre documentos, contratos, estatuto, regras, políticas, ou qualquer assunto que só pareça relacionado por uma palavra parecida — se não tiver certeza de que a pergunta é sobre categoria/tipo de imóvel, não chame esta ferramenta.'
WHERE entity_name = 'tipo_imovel'
  AND tenant_id IS NULL;

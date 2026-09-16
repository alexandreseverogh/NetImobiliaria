-- Corrige hook_type gravado fora do enum real do prompt creative_vision_analysis
-- (urgency|curiosity|social_proof|benefit|story|problem|other). Achado real testando o
-- aviso "Portfólio saturado com hook 'Preço'" no wizard de campanha: o LLM às vezes devolve
-- um valor do campo ANGLE (price/investment/lifestyle/family/social/luxury) no lugar de
-- hook_type — dois conceitos diferentes que esta plataforma rastreia separadamente — e o
-- código nunca validava isso antes de gravar (corrigido em creativeAnalysisService.ts).
--
-- Confirmado no banco: 8 linhas em TODO o banco (não só um tenant) com hook_type inválido —
-- 7 "price" + 1 "investment". Sem forma confiável de saber qual seria o hook_type correto
-- sem reprocessar via Vision (custo de LLM); "other" é o mesmo fallback já usado pelo
-- código (EMPTY_RESULT) pra "não sei classificar" — escolha conservadora, não um chute.
UPDATE campanhasmarketingdigital."CreativeAnalysis"
SET hook_type = 'other'
WHERE hook_type IS NOT NULL
  AND hook_type NOT IN ('urgency','curiosity','social_proof','benefit','story','problem','other');

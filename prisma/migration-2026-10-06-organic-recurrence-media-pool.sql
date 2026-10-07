-- FASE 16.H — Rodízio de criativos na recorrência de publicação orgânica.
--
-- Até aqui, OrganicRecurrenceSchedule.media_urls era o MESMO criativo em todas as
-- ocorrências geradas (texto já avisava "mesma em todas as ocorrências"). Esta migração
-- adiciona um POOL opcional de criativos — quando preenchido, o serviço de geração
-- (generatePostsForSchedule) distribui os criativos em rodízio (round-robin) pelos slots
-- gerados, em vez de repetir sempre o mesmo. Aditiva: media_urls continua existindo e
-- sendo usado como fallback (comportamento antigo) quando media_pool está vazio/ausente.
--
-- Formato de media_pool: array de arrays de URL — cada posição do array externo é UM post
-- (pode ter 1 imagem ou várias, pra suportar carrossel por posição do rodízio também).
-- Ex: [["url1.jpg"], ["url2.jpg", "url2b.jpg"], ["url3.jpg"]]

ALTER TABLE campanhasmarketingdigital."OrganicRecurrenceSchedule"
  ADD COLUMN IF NOT EXISTS media_pool JSONB;

COMMENT ON COLUMN campanhasmarketingdigital."OrganicRecurrenceSchedule".media_pool IS
  'Pool de criativos para rodízio round-robin entre as ocorrências geradas. Array de arrays de URL (cada posição = 1 post, pode ter >1 URL para carrossel). NULL/vazio = usa media_urls fixo (comportamento legado).';

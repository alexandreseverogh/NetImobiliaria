-- Código de rastreio manual pra campanha não lançada pelo nosso wizard (importada direto da
-- Meta/Google/TikTok, ou qualquer Campaign local) — docs/PLANO_REF_MANUAL_CAMPANHA_IMPORTADA.md.
--
-- 3º caminho de atribuição em resolveCtaRef (src/lib/cta/service.ts), ao lado de Ad.trackingId
-- (campanha lançada pelo wizard) e CtaDestination.slug (mecanismo de redirect próprio) — este
-- aqui não exige Ad/AdSet reais (que o import nunca cria) nem o conceito de "destino
-- redirecionável" (CtaDestination, pensado pra um cenário diferente, onde é nossa própria
-- página /l/{slug} que monta o link do WhatsApp — aqui não há página nossa no meio, o admin
-- cola o código direto na mensagem pré-preenchida configurada dentro do próprio anúncio).
--
-- NULL por padrão — só ganha valor quando o admin gera pela 1ª vez. Índice único PARCIAL (só
-- considera linhas não-nulas) no mesmo padrão já usado em idx_cta_destination_slug.

ALTER TABLE campanhasmarketingdigital."Campaign"
  ADD COLUMN IF NOT EXISTS manual_ref VARCHAR(40);

CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_manual_ref
  ON campanhasmarketingdigital."Campaign" (manual_ref)
  WHERE manual_ref IS NOT NULL;

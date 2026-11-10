-- Sinais de WhatsApp reportados pela Meta, gravados por dia/campanha no Insight.
-- Motivo: campanhas importadas (ou com CTA de WhatsApp direto) não passam pelo nosso rastreio,
-- então leads/CPL internos ficam zerados. Estes números vêm da própria Meta:
--   meta_link_clicks              = action_type 'link_click' (cliques no anúncio, incl. botão WhatsApp)
--   meta_conversations_started    = action_type 'onsite_conversion.messaging_conversation_started_7d'
-- Aditiva e idempotente: colunas novas com default 0, nada existente é alterado.

ALTER TABLE campanhasmarketingdigital."Insight"
  ADD COLUMN IF NOT EXISTS meta_link_clicks INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS meta_conversations_started INTEGER NOT NULL DEFAULT 0;

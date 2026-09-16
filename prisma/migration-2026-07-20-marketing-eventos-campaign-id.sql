-- Unificação de atribuição de leads (Sistema A x Sistema B) — ver
-- docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md §9.
--
-- marketing_eventos.utm_campaign é texto livre (nome digitado à mão, usado pelo Sistema B —
-- mecanismos de CTA geridos externamente). Não referencia campanhasmarketingdigital."Campaign".
--
-- campaign_id é o ID REAL da campanha, preenchido quando o lead se origina de uma campanha
-- lançada por esta plataforma (Sistema A, via resolveCtaRef -> Ad.trackingId -> Campaign.id).
-- Fica NULL para leads de mecanismos externos/formulário/orgânico, onde não há campanha real
-- desta plataforma para referenciar.
ALTER TABLE public.marketing_eventos
  ADD COLUMN IF NOT EXISTS campaign_id TEXT;

CREATE INDEX IF NOT EXISTS idx_marketing_eventos_campaign_id
  ON public.marketing_eventos (campaign_id)
  WHERE campaign_id IS NOT NULL;

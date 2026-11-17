-- 2026-11-15 — número dedicado para ALERTAS (SLA e agentes). Antes, os alertas usavam
-- tenants.numero_whatsapp, que também é o número do canal da Mensageria (inboxes.ts); por isso
-- um mesmo número não podia servir aos dois. Idempotente.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS whatsapp_alerta VARCHAR(20);

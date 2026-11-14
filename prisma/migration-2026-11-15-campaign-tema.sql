-- ============================================================
-- Campanha → Tema do ciclo de vendas
-- 2026-11-15
-- ============================================================
-- Tema definido na criação da campanha (wizard). Só é exigido/exibido quando o tenant
-- contratou o módulo de CRM; sem CRM a coluna fica sempre NULL.
-- Leads captados pela campanha herdam o tema (ver /api/crm/leads). Idempotente.

ALTER TABLE campanhasmarketingdigital."Campaign"
  ADD COLUMN IF NOT EXISTS tema_id INTEGER REFERENCES public.temas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_campaign_tema
  ON campanhasmarketingdigital."Campaign" (tema_id)
  WHERE tema_id IS NOT NULL;

-- ============================================================
-- Migration: FASE 21 — Feature Aprovações do Agente
-- Data: 2026-06-23
-- ============================================================

BEGIN;

INSERT INTO public.system_features (
  name, description, category_id, url, is_active, slug, sort_order, icon
) VALUES (
  'Aprovações do Agente',
  'Painel para aprovar ou rejeitar ações ofensivas sugeridas pelo agente autônomo (SCALE, REFRESH_CREATIVE).',
  22,
  '/admin/master/aprovacoes',
  true,
  'master-aprovacoes-agente',
  100,
  'CheckCircleIcon'
)
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  url         = EXCLUDED.url,
  icon        = EXCLUDED.icon,
  sort_order  = EXCLUDED.sort_order,
  updated_at  = NOW();

COMMIT;

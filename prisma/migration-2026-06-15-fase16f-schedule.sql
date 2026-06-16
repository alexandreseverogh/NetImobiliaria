-- ============================================================
-- FASE 16.F — Agendamento de publicações orgânicas
-- 2026-06-15
-- Adiciona media_kind (desambigua Stories imagem/vídeo) — necessário
-- para publicar posts agendados sem perder o tipo de mídia.
-- (scheduled_at / published_at já existem desde a 16.A.)
-- ============================================================

ALTER TABLE campanhasmarketingdigital."OrganicPost"
  ADD COLUMN IF NOT EXISTS media_kind varchar(10);

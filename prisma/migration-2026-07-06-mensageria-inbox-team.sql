-- ============================================================
-- Migration 2026-07-06: Mensageria — vínculo inbox → time (M3, auto-atribuição)
-- Cada inbox pode ter um time padrão responsável; se team.auto_assign=true,
-- toda conversa nova nessa inbox é distribuída automaticamente (least-loaded).
-- Idempotente.
-- ============================================================

BEGIN;

ALTER TABLE mensageria.inboxes
  ADD COLUMN IF NOT EXISTS team_id uuid REFERENCES mensageria.teams(id);

COMMIT;

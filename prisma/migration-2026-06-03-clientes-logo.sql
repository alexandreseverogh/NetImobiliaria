-- ============================================================
-- Adiciona logo_url à tabela public.clientes
-- 2026-06-03
-- ============================================================
-- Armazena base64 (data:image/...;base64,...) ou URL externa.
-- Mesmo padrão de public.tenants.logo_url.
-- ============================================================

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL;

COMMENT ON COLUMN public.clientes.logo_url IS
  'Logomarca do cliente — base64 (data:image/...;base64,...) ou URL externa. Mesmo padrão de tenants.logo_url.';

-- Domínio do site público de cada empresa (2026-11-07).
-- As rotas públicas (/api/public/corretor/*) descobrem a empresa pelo domínio da requisição.
-- Idempotente. Não preenche valores: cada empresa cadastra o próprio domínio no Master.

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS public_domain VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS tenants_public_domain_key
  ON public.tenants (public_domain)
  WHERE public_domain IS NOT NULL;

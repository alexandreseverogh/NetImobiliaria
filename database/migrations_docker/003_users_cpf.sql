-- Adiciona CPF no cadastro de users (ex.: corretor) e garante unicidade.
-- Idempotente.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS cpf VARCHAR(11);

-- Unicidade por CPF (somente quando preenchido)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_cpf_unique
  ON public.users (cpf)
  WHERE cpf IS NOT NULL;



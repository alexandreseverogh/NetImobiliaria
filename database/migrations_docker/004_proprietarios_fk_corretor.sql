-- 004_proprietarios_fk_corretor.sql
-- Adiciona vínculo opcional do Proprietário ao Corretor que efetuou o cadastro.
-- Idempotente: seguro para rodar em qualquer ambiente.

ALTER TABLE public.proprietarios
  ADD COLUMN IF NOT EXISTS fk_corretor uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_proprietarios_fk_corretor_users'
  ) THEN
    ALTER TABLE public.proprietarios
      ADD CONSTRAINT fk_proprietarios_fk_corretor_users
      FOREIGN KEY (fk_corretor)
      REFERENCES public.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_proprietarios_fk_corretor
  ON public.proprietarios (fk_corretor)
  WHERE fk_corretor IS NOT NULL;



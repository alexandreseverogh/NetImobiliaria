-- 005_proprietarios_corretor_fk.sql
-- Padroniza o nome do campo do corretor em proprietarios:
-- - Se existir fk_corretor, renomeia para corretor_fk
-- - Garante corretor_fk (uuid), FK para users(id) e índice
-- Idempotente: seguro para rodar em qualquer ambiente.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'proprietarios'
      AND column_name = 'fk_corretor'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'proprietarios'
      AND column_name = 'corretor_fk'
  ) THEN
    ALTER TABLE public.proprietarios RENAME COLUMN fk_corretor TO corretor_fk;
  END IF;
END $$;

ALTER TABLE public.proprietarios
  ADD COLUMN IF NOT EXISTS corretor_fk uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname IN (
      'fk_proprietarios_fk_corretor_users',
      'fk_proprietarios_corretor_fk_users'
    )
  ) THEN
    ALTER TABLE public.proprietarios
      ADD CONSTRAINT fk_proprietarios_corretor_fk_users
      FOREIGN KEY (corretor_fk)
      REFERENCES public.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_proprietarios_corretor_fk
  ON public.proprietarios (corretor_fk)
  WHERE corretor_fk IS NOT NULL;



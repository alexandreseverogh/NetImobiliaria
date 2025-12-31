-- 031_add_corretor_fk_to_imoveis.sql
-- Adiciona o campo imoveis.corretor_fk (UUID) para permitir direcionamento direto do lead ao corretor do imóvel.
-- (Requisito: se preenchido, o lead deve ir automaticamente para esse corretor.)

ALTER TABLE public.imoveis
  ADD COLUMN IF NOT EXISTS corretor_fk UUID NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_imoveis_corretor_fk'
  ) THEN
    ALTER TABLE public.imoveis
      ADD CONSTRAINT fk_imoveis_corretor_fk
      FOREIGN KEY (corretor_fk)
      REFERENCES public.users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_imoveis_corretor_fk
  ON public.imoveis (corretor_fk);



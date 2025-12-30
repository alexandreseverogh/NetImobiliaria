-- 006_imovel_corretor_corretor_localidades.sql
-- Cria tabelas de relacionamento para corretores:
-- 1) imovel_corretor: vínculo entre imóvel (imoveis.id) e corretor (users.id)
-- 2) corretor_localidades: localidades atendidas pelo corretor (estado/cidade)
-- Idempotente: seguro para rodar em qualquer ambiente/container.

-- =========================
-- 1) public.imovel_corretor
-- =========================
CREATE TABLE IF NOT EXISTS public.imovel_corretor (
  id          BIGSERIAL PRIMARY KEY,
  imovel_fk   INTEGER NOT NULL,
  corretor_fk UUID    NOT NULL,
  created_at  TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by  UUID
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_imovel_corretor_imovel_fk'
  ) THEN
    ALTER TABLE public.imovel_corretor
      ADD CONSTRAINT fk_imovel_corretor_imovel_fk
      FOREIGN KEY (imovel_fk)
      REFERENCES public.imoveis(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_imovel_corretor_corretor_fk'
  ) THEN
    ALTER TABLE public.imovel_corretor
      ADD CONSTRAINT fk_imovel_corretor_corretor_fk
      FOREIGN KEY (corretor_fk)
      REFERENCES public.users(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_imovel_corretor_created_by'
  ) THEN
    ALTER TABLE public.imovel_corretor
      ADD CONSTRAINT fk_imovel_corretor_created_by
      FOREIGN KEY (created_by)
      REFERENCES public.users(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_imovel_corretor_imovel_corretor'
  ) THEN
    ALTER TABLE public.imovel_corretor
      ADD CONSTRAINT uq_imovel_corretor_imovel_corretor
      UNIQUE (imovel_fk, corretor_fk);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_imovel_corretor_imovel_fk
  ON public.imovel_corretor (imovel_fk);

CREATE INDEX IF NOT EXISTS idx_imovel_corretor_corretor_fk
  ON public.imovel_corretor (corretor_fk);

CREATE INDEX IF NOT EXISTS idx_imovel_corretor_created_at
  ON public.imovel_corretor (created_at);


-- =============================
-- 2) public.corretor_localidades
-- =============================
CREATE TABLE IF NOT EXISTS public.corretor_localidades (
  id          BIGSERIAL PRIMARY KEY,
  corretor_fk UUID    NOT NULL,
  estado_fk   CHAR(2) NOT NULL,
  cidade_fk   VARCHAR(100) NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_corretor_localidades_corretor_fk'
  ) THEN
    ALTER TABLE public.corretor_localidades
      ADD CONSTRAINT fk_corretor_localidades_corretor_fk
      FOREIGN KEY (corretor_fk)
      REFERENCES public.users(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_corretor_localidades_corretor_estado_cidade'
  ) THEN
    ALTER TABLE public.corretor_localidades
      ADD CONSTRAINT uq_corretor_localidades_corretor_estado_cidade
      UNIQUE (corretor_fk, estado_fk, cidade_fk);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_corretor_localidades_corretor_fk
  ON public.corretor_localidades (corretor_fk);

CREATE INDEX IF NOT EXISTS idx_corretor_localidades_estado_cidade
  ON public.corretor_localidades (estado_fk, cidade_fk);



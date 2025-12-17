-- Fase 4 – Conversão de PK para UUID (clientes / proprietarios)
-- Data: 08/11/25
-- Pré-requisitos: checklist Guardian aprovado, backup full (`pg_dump`), evidências das consultas em `docs/PLANO_MIGRACAO_UUID_CLIENTES_PROPRIETARIOS.md`.

BEGIN;

-- Garantir isolamento adequado durante a janela controlada
SET lock_timeout TO '5s';
SET statement_timeout TO '30s';

DO $$
DECLARE
  clientes_missing_uuid integer;
  proprietarios_missing_uuid integer;
  fk_clientes_legada integer;
  fk_proprietarios_legada integer;
BEGIN
  SELECT COUNT(*) INTO clientes_missing_uuid FROM clientes WHERE uuid IS NULL;
  IF clientes_missing_uuid > 0 THEN
    RAISE EXCEPTION 'Existem % clientes sem UUID (abortando migração).', clientes_missing_uuid;
  END IF;

  SELECT COUNT(*) INTO proprietarios_missing_uuid FROM proprietarios WHERE uuid IS NULL;
  IF proprietarios_missing_uuid > 0 THEN
    RAISE EXCEPTION 'Existem % proprietarios sem UUID (abortando migração).', proprietarios_missing_uuid;
  END IF;

  SELECT COUNT(*) INTO fk_clientes_legada
  FROM pg_constraint c
  JOIN pg_attribute a
    ON a.attrelid = c.confrelid
   AND a.attnum = ANY (c.confkey)
  WHERE c.contype = 'f'
    AND c.confrelid = 'clientes'::regclass
    AND a.attname = 'id';

  IF fk_clientes_legada > 0 THEN
    RAISE EXCEPTION 'Ainda existem % FKs referenciando clientes.id (abortando migração).', fk_clientes_legada;
  END IF;

  SELECT COUNT(*) INTO fk_proprietarios_legada
  FROM pg_constraint c
  JOIN pg_attribute a
    ON a.attrelid = c.confrelid
   AND a.attnum = ANY (c.confkey)
  WHERE c.contype = 'f'
    AND c.confrelid = 'proprietarios'::regclass
    AND a.attname = 'id';

  IF fk_proprietarios_legada > 0 THEN
    RAISE EXCEPTION 'Ainda existem % FKs referenciando proprietarios.id (abortando migração).', fk_proprietarios_legada;
  END IF;
END;
$$;

-- Conversão da PK de clientes
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_pkey;
ALTER TABLE clientes DROP COLUMN IF EXISTS id;
ALTER TABLE clientes ADD CONSTRAINT clientes_pkey PRIMARY KEY (uuid);

-- Limpeza de sequências legadas (se existirem)
DROP SEQUENCE IF EXISTS clientes_id_seq;

-- Conversão da PK de proprietarios
ALTER TABLE proprietarios DROP CONSTRAINT IF EXISTS proprietarios_pkey;
ALTER TABLE proprietarios DROP COLUMN IF EXISTS id;
ALTER TABLE proprietarios ADD CONSTRAINT proprietarios_pkey PRIMARY KEY (uuid);

DROP SEQUENCE IF EXISTS proprietarios_id_seq;

-- Pós validações
DO $$
DECLARE
  pk_clientes_uuid boolean;
  pk_proprietarios_uuid boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'clientes'::regclass
      AND contype = 'p'
      AND pg_get_constraintdef(oid) LIKE '%(uuid)%'
  ) INTO pk_clientes_uuid;

  IF NOT pk_clientes_uuid THEN
    RAISE EXCEPTION 'Falha ao validar PK de clientes baseada em uuid.';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'proprietarios'::regclass
      AND contype = 'p'
      AND pg_get_constraintdef(oid) LIKE '%(uuid)%'
  ) INTO pk_proprietarios_uuid;

  IF NOT pk_proprietarios_uuid THEN
    RAISE EXCEPTION 'Falha ao validar PK de proprietarios baseada em uuid.';
  END IF;
END;
$$;

-- Recomendações pós-execução: executar REINDEX e VACUUM conforme necessário
-- REINDEX TABLE clientes;
-- REINDEX TABLE proprietarios;

COMMIT;



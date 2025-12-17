-- Fase 4 – Rollback da conversão de PK para UUID (clientes / proprietarios)
-- Data: 08/11/25
-- Observação: a restauração completa deve preferencialmente utilizar o backup gerado antes da fase destrutiva (`pg_dump`). Este script recompõe a estrutura com PK inteira para reabilitar integrações legadas.

BEGIN;

SET lock_timeout TO '5s';
SET statement_timeout TO '30s';

-- Reintroduzir coluna ID em clientes
ALTER TABLE clientes DROP CONSTRAINT IF EXISTS clientes_pkey;
ALTER TABLE clientes ADD COLUMN id INTEGER;

WITH ordered AS (
  SELECT uuid, ROW_NUMBER() OVER (ORDER BY uuid) AS new_id
  FROM clientes
)
UPDATE clientes c
SET id = o.new_id
FROM ordered o
WHERE c.uuid = o.uuid;

ALTER TABLE clientes ALTER COLUMN id SET NOT NULL;
ALTER TABLE clientes ADD CONSTRAINT clientes_pkey PRIMARY KEY (id);

-- Manter unicidade de UUID para evitar regressões
ALTER TABLE clientes ADD CONSTRAINT clientes_uuid_key UNIQUE (uuid);

-- Recriar sequência e associar à coluna
DROP SEQUENCE IF EXISTS clientes_id_seq;
CREATE SEQUENCE clientes_id_seq START WITH 1 OWNED BY clientes.id;
SELECT setval('clientes_id_seq', (SELECT MAX(id) FROM clientes));
ALTER TABLE clientes ALTER COLUMN id SET DEFAULT nextval('clientes_id_seq');

-- Reintroduzir coluna ID em proprietarios
ALTER TABLE proprietarios DROP CONSTRAINT IF EXISTS proprietarios_pkey;
ALTER TABLE proprietarios ADD COLUMN id INTEGER;

WITH ordered_prop AS (
  SELECT uuid, ROW_NUMBER() OVER (ORDER BY uuid) AS new_id
  FROM proprietarios
)
UPDATE proprietarios p
SET id = o.new_id
FROM ordered_prop o
WHERE p.uuid = o.uuid;

ALTER TABLE proprietarios ALTER COLUMN id SET NOT NULL;
ALTER TABLE proprietarios ADD CONSTRAINT proprietarios_pkey PRIMARY KEY (id);
ALTER TABLE proprietarios ADD CONSTRAINT proprietarios_uuid_key UNIQUE (uuid);

DROP SEQUENCE IF EXISTS proprietarios_id_seq;
CREATE SEQUENCE proprietarios_id_seq START WITH 1 OWNED BY proprietarios.id;
SELECT setval('proprietarios_id_seq', (SELECT MAX(id) FROM proprietarios));
ALTER TABLE proprietarios ALTER COLUMN id SET DEFAULT nextval('proprietarios_id_seq');

COMMIT;



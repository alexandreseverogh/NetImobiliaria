-- ================================================================
-- FASE 2: Migração para UUID - Adicionar Colunas (DUAL KEY)
-- Data: 2025-11-06
-- Objetivo: Adicionar UUIDs mantendo INTEGERs para transição segura
-- ATENÇÃO: Esta é uma migração gradual e reversível
-- ================================================================

-- ================================================================
-- CHECKPOINT 1: Verificar e Habilitar Extensão UUID
-- ================================================================

BEGIN;

-- Habilitar extensão uuid-ossp se não existir
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

SELECT 'Extensao uuid-ossp habilitada';

COMMIT;

-- ================================================================
-- CHECKPOINT 2: Adicionar Coluna UUID em CLIENTES
-- ================================================================

BEGIN;

-- Adicionar coluna uuid (mantendo id INTEGER)
ALTER TABLE clientes 
  ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT uuid_generate_v4();

-- Criar índice único
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_uuid_unique ON clientes(uuid);

-- Gerar UUIDs para registros que não têm
UPDATE clientes SET uuid = uuid_generate_v4() WHERE uuid IS NULL;

-- Tornar coluna NOT NULL após popular
ALTER TABLE clientes ALTER COLUMN uuid SET NOT NULL;

-- Comentário
COMMENT ON COLUMN clientes.uuid IS 'ID UUID para futura migração (dual key com INTEGER)';

SELECT 'CHECKPOINT 2 COMPLETO: UUID adicionado em clientes';
SELECT 'Total de clientes com UUID:', COUNT(*) FROM clientes WHERE uuid IS NOT NULL;

COMMIT;

-- ================================================================
-- CHECKPOINT 3: Adicionar Coluna UUID em PROPRIETARIOS
-- ================================================================

BEGIN;

-- Adicionar coluna uuid (mantendo id INTEGER)
ALTER TABLE proprietarios 
  ADD COLUMN IF NOT EXISTS uuid UUID DEFAULT uuid_generate_v4();

-- Criar índice único
CREATE UNIQUE INDEX IF NOT EXISTS idx_proprietarios_uuid_unique ON proprietarios(uuid);

-- Gerar UUIDs para registros que não têm
UPDATE proprietarios SET uuid = uuid_generate_v4() WHERE uuid IS NULL;

-- Tornar coluna NOT NULL após popular
ALTER TABLE proprietarios ALTER COLUMN uuid SET NOT NULL;

-- Comentário
COMMENT ON COLUMN proprietarios.uuid IS 'ID UUID para futura migração (dual key com INTEGER)';

SELECT 'CHECKPOINT 3 COMPLETO: UUID adicionado em proprietarios';
SELECT 'Total de proprietarios com UUID:', COUNT(*) FROM proprietarios WHERE uuid IS NOT NULL;

COMMIT;

-- ================================================================
-- CHECKPOINT 4: Adicionar Coluna proprietario_uuid em IMOVEIS
-- ================================================================

BEGIN;

-- Adicionar coluna proprietario_uuid (mantendo proprietario_fk INTEGER)
ALTER TABLE imoveis 
  ADD COLUMN IF NOT EXISTS proprietario_uuid UUID;

-- Popular proprietario_uuid baseado no proprietario_fk
UPDATE imoveis i
SET proprietario_uuid = p.uuid
FROM proprietarios p
WHERE i.proprietario_fk = p.id;

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_imoveis_proprietario_uuid ON imoveis(proprietario_uuid);

-- Criar FK para integridade referencial
ALTER TABLE imoveis
  ADD CONSTRAINT fk_imoveis_proprietario_uuid 
  FOREIGN KEY (proprietario_uuid) REFERENCES proprietarios(uuid)
  ON DELETE SET NULL;

-- Comentário
COMMENT ON COLUMN imoveis.proprietario_uuid IS 'FK UUID do proprietário (dual key com proprietario_fk INTEGER)';

SELECT 'CHECKPOINT 4 COMPLETO: UUID adicionado em imoveis';
SELECT 'Total de imoveis com proprietario_uuid:', COUNT(*) FROM imoveis WHERE proprietario_uuid IS NOT NULL;

COMMIT;

-- ================================================================
-- VERIFICAÇÕES FINAIS
-- ================================================================

DO $$
DECLARE
  count_clientes INTEGER;
  count_clientes_uuid INTEGER;
  count_proprietarios INTEGER;
  count_proprietarios_uuid INTEGER;
  count_imoveis INTEGER;
  count_imoveis_uuid INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_clientes FROM clientes;
  SELECT COUNT(*) INTO count_clientes_uuid FROM clientes WHERE uuid IS NOT NULL;
  SELECT COUNT(*) INTO count_proprietarios FROM proprietarios;
  SELECT COUNT(*) INTO count_proprietarios_uuid FROM proprietarios WHERE uuid IS NOT NULL;
  SELECT COUNT(*) INTO count_imoveis FROM imoveis WHERE proprietario_fk IS NOT NULL;
  SELECT COUNT(*) INTO count_imoveis_uuid FROM imoveis WHERE proprietario_uuid IS NOT NULL;
  
  RAISE NOTICE '================================';
  RAISE NOTICE 'MIGRACAO UUID - ESTATISTICAS:';
  RAISE NOTICE '================================';
  RAISE NOTICE 'Clientes total: %', count_clientes;
  RAISE NOTICE 'Clientes com UUID: %', count_clientes_uuid;
  RAISE NOTICE 'Proprietarios total: %', count_proprietarios;
  RAISE NOTICE 'Proprietarios com UUID: %', count_proprietarios_uuid;
  RAISE NOTICE 'Imoveis com proprietario_fk: %', count_imoveis;
  RAISE NOTICE 'Imoveis com proprietario_uuid: %', count_imoveis_uuid;
  RAISE NOTICE '================================';
  
  IF count_clientes != count_clientes_uuid THEN
    RAISE WARNING 'ATENCAO: Nem todos os clientes têm UUID!';
  END IF;
  
  IF count_proprietarios != count_proprietarios_uuid THEN
    RAISE WARNING 'ATENCAO: Nem todos os proprietarios têm UUID!';
  END IF;
  
  IF count_imoveis != count_imoveis_uuid THEN
    RAISE WARNING 'ATENCAO: Nem todos os imoveis têm proprietario_uuid!';
  END IF;
END $$;

-- ================================================================
-- DUAL KEY ATIVO
-- Agora as tabelas têm:
-- - clientes: id (INTEGER) + uuid (UUID)
-- - proprietarios: id (INTEGER) + uuid (UUID)  
-- - imoveis: proprietario_fk (INTEGER) + proprietario_uuid (UUID)
--
-- Sistema pode usar AMBOS simultaneamente!
-- ================================================================



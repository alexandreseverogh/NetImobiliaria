-- ###########################################################################
-- Script: Fase 3 – Migração Imóveis UUID Only
-- Objetivo: preparar a tabela imoveis para operar exclusivamente com proprietario_uuid
-- Status: NÃO EXECUTAR em produção sem aprovação Guardian e rollback validado.
-- Pré-condições:
--   1. Documentação atualizada (planos, inventários, análises de impacto).
--   2. Diagnósticos confirmando inexistência de registros com proprietario_uuid nulo.
--   3. Backup completo do banco (`pg_dump`) disponível.
-- ###########################################################################

\echo 'Iniciando validações prévias...'

-- Validação 1: todos os imóveis possuem proprietario_uuid
SELECT COUNT(*) AS imoveis_sem_uuid
FROM imoveis
WHERE proprietario_uuid IS NULL;

-- Validação 2: consistência entre proprietario_uuid e proprietario_fk (quando existir)
SELECT COUNT(*) AS divergencias_dual_key
FROM imoveis i
LEFT JOIN proprietarios p ON i.proprietario_uuid = p.uuid
WHERE i.proprietario_uuid IS NOT NULL
  AND p.uuid IS NULL;

-- ###########################################################################
-- Etapa A – Tornar proprietario_uuid obrigatório
-- (Executar somente após validações retornarem zero.)
-- ###########################################################################

\echo 'Aplicando NOT NULL em imoveis.proprietario_uuid (Fase 3 - Etapa A)...'

BEGIN;

ALTER TABLE imoveis
  ALTER COLUMN proprietario_uuid SET NOT NULL;

COMMIT;

-- ###########################################################################
-- Etapa B – Remover coluna proprietario_fk (fase destrutiva)
-- Somente após homologação completa e aprovação Guardian.
-- ###########################################################################

\echo 'Removendo coluna proprietario_fk (Fase 3 - Etapa B)...'

BEGIN;

ALTER TABLE imoveis
  DROP COLUMN IF EXISTS proprietario_fk;

COMMIT;

-- ###########################################################################
-- Pós-execução: revalidações
-- ###########################################################################

\echo 'Reexecutando validações pós-migração...'

SELECT COUNT(*) AS imoveis_sem_uuid_pos
FROM imoveis
WHERE proprietario_uuid IS NULL;

\echo 'Script concluído. Registrar evidências e atualizar inventários.'

-- ###########################################################################
-- Bloco de Rollback (reverter Etapa B e Etapa A)
-- ###########################################################################
-- OBS: Requer backup prévio das informações inteiras.
-- 1. Recriar coluna proprietario_fk.
-- 2. Repopular com base em proprietarios.id e proprietario_uuid.
-- 3. Remover NOT NULL de proprietario_uuid se necessário.
-- ###########################################################################

-- ###########################################################################
-- Rollback (executar MANUALMENTE se necessário)
-- ###########################################################################
-- Para reverter a remoção:
--   BEGIN;
--   ALTER TABLE imoveis ADD COLUMN proprietario_fk INTEGER;
--   UPDATE imoveis i
--     SET proprietario_fk = p.id
--     FROM proprietarios p
--     WHERE i.proprietario_uuid = p.uuid;
--   ALTER TABLE imoveis ALTER COLUMN proprietario_uuid DROP NOT NULL;
--   COMMIT;
-- ###########################################################################



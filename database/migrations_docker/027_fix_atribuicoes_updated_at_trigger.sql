-- 027_fix_atribuicoes_updated_at_trigger.sql
-- O projeto já tem uma função/trigger padrão (update_updated_at_column) que atualiza a coluna `updated_at`.
-- A tabela imovel_prospect_atribuicoes foi criada com `atualizado_em`. Para compatibilidade, adicionamos `updated_at`.

ALTER TABLE public.imovel_prospect_atribuicoes
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;



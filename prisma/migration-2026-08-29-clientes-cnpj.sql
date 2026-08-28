-- Migração: clientes ganha suporte a CNPJ (pessoa jurídica), espelhando o padrão já
-- comprovado em public.proprietarios (CPF e CNPJ mutuamente exclusivos, cada um único
-- por tenant via índice parcial). Aditiva — nenhuma coluna existente é removida.
--
-- Contexto: um cliente pode ser pessoa física (CPF) ou pessoa jurídica (CNPJ) — hoje
-- clientes.cpf é NOT NULL e não existe cnpj, forçando negócios reais a usar CPFs falsos
-- de placeholder (confirmado em produção: Clínica OdontoVida, AutoMax Veículos, etc.
-- todos com CPF "11111111111"-like). Ver docs/CHECKPOINT.md 2026-08-29.

BEGIN;

-- 1) Torna cpf opcional (era NOT NULL)
ALTER TABLE public.clientes ALTER COLUMN cpf DROP NOT NULL;

-- 2) Adiciona cnpj (mesmo tamanho de coluna usado em proprietarios.cnpj)
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18);

-- 3) Recria o índice único de cpf como PARCIAL (só linhas com cpf preenchido) —
--    o índice antigo não era parcial; múltiplos NULL já são permitidos em UNIQUE do
--    Postgres por padrão, mas tornamos explícito para espelhar proprietarios e deixar
--    a intenção clara no schema.
DROP INDEX IF EXISTS public.idx_clientes_cpf_tenant_unique;
CREATE UNIQUE INDEX idx_clientes_cpf_tenant_unique
  ON public.clientes (tenant_id, cpf)
  WHERE cpf IS NOT NULL;

-- 4) Índices de cnpj (mesmo par usado em proprietarios: um índice de busca simples +
--    um único parcial por tenant)
CREATE INDEX IF NOT EXISTS idx_clientes_cnpj ON public.clientes (cnpj);
CREATE UNIQUE INDEX IF NOT EXISTS idx_clientes_cnpj_tenant_unique
  ON public.clientes (tenant_id, cnpj)
  WHERE cnpj IS NOT NULL;

COMMIT;

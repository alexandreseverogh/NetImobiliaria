-- Parâmetro por tenant: qual tipo de atividade de catálogo representa "troca de mensagens".
-- Opção B (decisão 2026-11-10): o tipo define APENAS a aparência (nome, ícone, cor) das
-- mensagens no Histórico do lead. NÃO cria linha em atividades_lead por mensagem.
-- Nullable: tenant sem tipo configurado simplesmente mostra mensagens com aparência padrão.
-- A FK usa ON DELETE SET NULL: se o tipo for excluído, o tenant volta ao padrão sem erro.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS tipo_atividade_mensagem_id INTEGER
    REFERENCES public.tipos_atividade(id) ON DELETE SET NULL;

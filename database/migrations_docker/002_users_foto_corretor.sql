-- Adiciona suporte a foto do usuário (ex.: corretor) no cadastro.
-- Idempotente: só cria colunas se não existirem.
-- Observação: a tabela `users` já possui `creci` no schema atual.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS foto BYTEA;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS foto_tipo_mime TEXT;



-- 016_add_isencao_to_users.sql
-- Adiciona o campo isencao na tabela de usuários.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'isencao'
    ) THEN
        ALTER TABLE public.users ADD COLUMN isencao BOOLEAN DEFAULT FALSE;
    END IF;
END $$;


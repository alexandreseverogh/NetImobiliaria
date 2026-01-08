-- Adicionar coluna tipo_corretor
ALTER TABLE users ADD COLUMN IF NOT EXISTS tipo_corretor VARCHAR(20) DEFAULT 'Externo';

-- Migrar dados existentes
-- Plantonistas são Internos
UPDATE users SET tipo_corretor = 'Interno' WHERE is_plantonista = true;

-- Garantir que os demais sejam Externos (caso o default não tenha pego retroativo em versões antigas do PG, mas aqui pega)
UPDATE users SET tipo_corretor = 'Externo' WHERE tipo_corretor IS NULL;

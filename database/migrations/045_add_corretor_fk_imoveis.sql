
BEGIN;

-- Add checking if column doesn't exist to avoid errors on re-run
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'imoveis' AND column_name = 'corretor_fk') THEN
        ALTER TABLE imoveis ADD COLUMN corretor_fk UUID REFERENCES users(id) ON DELETE SET NULL;
        CREATE INDEX idx_imoveis_corretor_fk ON imoveis(corretor_fk);
    END IF;
END $$;

COMMIT;

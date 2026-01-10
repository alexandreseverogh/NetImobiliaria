
BEGIN;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'tipo_corretor') THEN
        ALTER TABLE users ADD COLUMN tipo_corretor VARCHAR(50) DEFAULT 'Interno';
        -- Optional: Create an index if we plan to filter by this column frequently
        CREATE INDEX idx_users_tipo_corretor ON users(tipo_corretor);
    END IF;
END $$;

COMMIT;

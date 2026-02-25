-- Migration to ensure the 'preco' field in 'imoveis' table is optional (nullable)
-- and does not have constraints preventing zero values.

-- 1. Ensure the column allows NULL values
ALTER TABLE imoveis ALTER COLUMN preco DROP NOT NULL;

-- 2. Remove any potential check constraints that might require preco > 0
-- (Only necessary if such constraints exist. Harmless if they don't, 
-- but we use a DO block to be safe and precise).
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conrelid = 'imoveis'::regclass 
        AND conname = 'check_preco_positive'
    ) THEN
        ALTER TABLE imoveis DROP CONSTRAINT check_preco_positive;
    END IF;
END $$;

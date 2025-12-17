-- Add phone field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS telefone VARCHAR(20);

-- Update existing users with sample phone numbers
UPDATE users SET telefone = '(81) 99901-2600' WHERE username = 'admin';
UPDATE users SET telefone = '(81) 99901-2601' WHERE username = 'corretor1';
UPDATE users SET telefone = '(81) 99901-2602' WHERE username = 'assistente1';












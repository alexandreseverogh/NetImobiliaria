const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/netimobiliaria"
});

async function runMigration() {
  const sql = `
    -- 1. Tabela de definições dos campos customizados
    CREATE TABLE IF NOT EXISTS role_custom_fields (
        id SERIAL PRIMARY KEY,
        role_id INTEGER REFERENCES user_roles(id) ON DELETE CASCADE,
        field_name VARCHAR(50) NOT NULL,
        field_label VARCHAR(100) NOT NULL,
        field_type VARCHAR(20) NOT NULL DEFAULT 'text',
        mask VARCHAR(50),
        is_required BOOLEAN DEFAULT false,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role_id, field_name)
    );

    -- 2. Adicionar coluna JSONB na tabela users para guardar os valores preenchidos
    ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_data JSONB DEFAULT '{}'::jsonb;

    -- 3. Trigger para updated_at (ignorar se falhar caso a função não exista)
    DO $$ 
    BEGIN
        IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
            IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_role_custom_fields_updated_at') THEN
                CREATE TRIGGER update_role_custom_fields_updated_at 
                BEFORE UPDATE ON role_custom_fields
                FOR EACH ROW 
                EXECUTE FUNCTION update_updated_at_column();
            END IF;
        END IF;
    END $$;
  `;

  try {
    console.log('Iniciando migração de campos dinâmicos...');
    await pool.query(sql);
    console.log('Migração concluída com sucesso!');
  } catch (err) {
    console.error('Erro na migração:', err);
  } finally {
    await pool.end();
  }
}

runMigration();

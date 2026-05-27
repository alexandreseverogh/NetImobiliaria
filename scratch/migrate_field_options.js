const { Pool } = require('pg');

const pool = new Pool({
  host: '127.0.0.1',
  port: 15432,
  user: 'postgres',
  password: 'postgres',
  database: 'net_imobiliaria',
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔍 Verificando estrutura da tabela role_custom_fields...');
    
    // Adicionar coluna field_options se não existir
    await client.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name='role_custom_fields' AND column_name='field_options') THEN
          ALTER TABLE role_custom_fields ADD COLUMN field_options TEXT;
          RAISE NOTICE 'Coluna field_options adicionada com sucesso.';
        ELSE
          RAISE NOTICE 'Coluna field_options já existe.';
        END IF;
      END $$;
    `);
    
    console.log('✅ Migração concluída com sucesso!');
  } catch (err) {
    console.error('❌ Erro na migração:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('--- ADICIONANDO TENANT_ID EM CLIENTES ---');
    await client.query(`
      ALTER TABLE clientes 
      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id)
    `);

    console.log('--- ADICIONANDO TENANT_ID EM PROPRIETARIOS ---');
    await client.query(`
      ALTER TABLE proprietarios 
      ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id)
    `);

    await client.query('COMMIT');
    console.log('✅ Migração concluída com sucesso!');
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    console.error('❌ Erro na migração:', err.message);
  } finally {
    if (client) client.release();
    await pool.end();
    process.exit(0);
  }
}

migrate();

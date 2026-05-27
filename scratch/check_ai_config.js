const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: '127.0.0.1',
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT),
  });

  try {
    const res = await pool.query(`
      SELECT id, name, ai_config
      FROM tenants
      WHERE name ILIKE '%Imobiliaria XYZ%'
    `);
    if (res.rows.length === 0) {
      console.log('❌ Tenant não encontrado!');
    } else {
      const t = res.rows[0];
      console.log('Tenant ID:', t.id);
      console.log('Tenant Name:', t.name);
      console.log('ai_config RAW:', JSON.stringify(t.ai_config, null, 2));
      console.log('--- Extraindo campos ---');
      console.log('groq_key:', t.ai_config?.groq_key || '(vazio)');
      console.log('gemini_key:', t.ai_config?.gemini_key || '(vazio)');
      console.log('preferred_model:', t.ai_config?.preferred_model || '(vazio)');
    }
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await pool.end();
  }
}

check();

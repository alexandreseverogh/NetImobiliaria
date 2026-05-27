const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function fix() {
  const pool = new Pool({
    user: process.env.DB_USER,
    host: '127.0.0.1',
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT),
  });

  const tenantId = 'c828d003-6213-4464-aa38-6c5d10a0aa9a';

  try {
    // A chave Groq estava salva erroneamente no campo preferred_model
    // Vamos mover para o campo correto e definir um modelo padrão
    const result = await pool.query(`
      UPDATE tenants
      SET ai_config = jsonb_build_object(
        'groq_key', ai_config->>'preferred_model',
        'gemini_key', '',
        'preferred_model', 'llama-3.3-70b-versatile'
      )
      WHERE id = $1
      RETURNING ai_config
    `, [tenantId]);

    console.log('✅ ai_config corrigido:');
    console.log(JSON.stringify(result.rows[0].ai_config, null, 2));
  } catch (err) {
    console.error('❌ Erro:', err.message);
  } finally {
    await pool.end();
  }
}

fix();

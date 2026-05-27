const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function fix() {
  try {
    const metadata = JSON.stringify({
      type: 'IA',
      origin: 'Austin, Texas',
      version: '1.5.0',
      requirements: [
        { id: 'Atividade', label: 'Histórico de Atividade', target: 'users', type: 'text' },
        { id: 'Preferencias', label: 'Perfil de Preferências', target: 'users', type: 'json' }
      ]
    });

    const res = await pool.query(
      "UPDATE system_features SET skill_metadata = $1 WHERE slug = 'brainstorming-sync' OR name = 'Creative Brainstorming Core'",
      [metadata]
    );

    console.log(`✅ Resultado: ${res.rowCount} Skill(s) atualizada(s)! Alvos definidos como 'users'.`);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

fix();

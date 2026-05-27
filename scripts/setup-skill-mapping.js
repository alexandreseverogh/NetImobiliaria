const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function updateMetadata() {
  try {
    const metadata = {
      type: 'AI',
      requirements: [
        { id: 'price_field', label: 'Campo de Valor Comercial', target: 'imoveis' },
        { id: 'lead_name_field', label: 'Campo de Nome do Lead', target: 'imovel_prospects' }
      ]
    };

    await pool.query(
      "UPDATE system_features SET is_skill = true, skill_metadata = $1 WHERE name ILIKE '%Artemis AI%'",
      [JSON.stringify(metadata)]
    );
    console.log('✅ Metadados de Mapeamento injetados na Skill Artemis AI Lead Scorer!');
  } catch (err) {
    console.error('Erro ao atualizar metadados:', err);
  } finally {
    await pool.end();
  }
}

updateMetadata();

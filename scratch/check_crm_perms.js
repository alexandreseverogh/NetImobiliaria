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
      SELECT sf.id, sf.name, sf.slug, 
             (SELECT count(*) FROM permissions p WHERE p.feature_id = sf.id) as perms_count
      FROM system_features sf
      JOIN system_feature_modules sfm ON sf.id = sfm.feature_id
      JOIN system_modules sm ON sfm.module_id = sm.id
      WHERE sm.slug = 'crm'
    `);
    console.log('CRM Features and Permission counts:');
    console.table(res.rows);

    const missing = res.rows.filter(r => parseInt(r.perms_count) === 0);
    if (missing.length > 0) {
      console.log('\n❌ Features sem NENHUMA entrada na tabela permissions:');
      console.log(missing.map(m => m.name).join(', '));
    }

  } catch (err) {
    console.error('Erro:', err.message);
  } finally {
    await pool.end();
  }
}

check();

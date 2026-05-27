const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function checkFeatureModules() {
  try {
    const query = `
      SELECT f.name as feature_name, f.id as feature_id, m.name as module_name
      FROM system_features f
      JOIN system_feature_modules sfm ON f.id = sfm.feature_id
      JOIN system_modules m ON sfm.module_id = m.id
      WHERE f.id IN (19, 57)
    `;
    const res = await pool.query(query);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkFeatureModules();

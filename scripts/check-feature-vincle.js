const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function checkFeatureVincle() {
  try {
    const query = `
      SELECT m.name as module_name, sfm.feature_id 
      FROM system_feature_modules sfm 
      JOIN system_modules m ON sfm.module_id = m.id 
      WHERE sfm.feature_id IN (8, 10, 16, 54, 4)
    `;
    const res = await pool.query(query);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkFeatureVincle();

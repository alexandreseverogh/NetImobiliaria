const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function checkXYZ() {
  try {
    const res = await pool.query(`
      SELECT feature_id, is_active 
      FROM tenant_feature_overrides 
      WHERE tenant_id = 'c828d003-6213-4464-aa38-6c5d10a0aa9a' 
        AND feature_id IN (19, 57, 66, 71)
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkXYZ();

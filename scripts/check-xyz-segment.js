const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function checkSegmentName() {
  try {
    const query = `
      SELECT t.name as tenant, s.name as segment_name, s.id as segment_id
      FROM tenants t 
      JOIN system_segments s ON t.segment_id = s.id 
      WHERE t.name ILIKE '%XYZ%'
    `;
    const res = await pool.query(query);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkSegmentName();

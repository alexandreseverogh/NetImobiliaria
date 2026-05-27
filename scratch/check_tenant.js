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
      SELECT t.id, t.name, t.segment_id, t.segment, s.name as segment_name
      FROM tenants t
      LEFT JOIN system_segments s ON t.segment_id = s.id
      WHERE t.name ILIKE '%Imobiliaria XYZ%'
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

check();

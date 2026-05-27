const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function checkSpecificItems() {
  try {
    const query = `
      SELECT id, name, parent_id, system_id, is_active, feature_id, permission_required
      FROM sidebar_menu_items
      WHERE id IN (2, 3, 4, 5, 8, 52)
    `;
    const res = await pool.query(query);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkSpecificItems();

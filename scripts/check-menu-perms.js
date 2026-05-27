const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function checkMenuPermissions() {
  try {
    const query = `
      SELECT 
        s.name as menu_item, 
        s.permission_required as menu_perm, 
        f.slug as feature_slug,
        f.name as feature_name
      FROM sidebar_menu_items s
      LEFT JOIN system_features f ON s.feature_id = f.id
      WHERE s.is_active = true
      AND (s.feature_id IS NOT NULL)
    `;
    const res = await pool.query(query);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkMenuPermissions();

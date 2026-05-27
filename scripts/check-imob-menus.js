const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function checkMenuItems() {
  try {
    const query = `
      SELECT 
        m.name as module, 
        f.name as feature, 
        f.slug as feature_slug, 
        s.name as menu_item, 
        s.system_id,
        s.is_active as menu_active
      FROM system_modules m
      JOIN system_feature_modules fm ON m.id = fm.module_id
      JOIN system_features f ON fm.feature_id = f.id
      LEFT JOIN sidebar_menu_items s ON f.id = s.feature_id
      WHERE m.name = 'Mercado Imobiliário'
    `;
    const res = await pool.query(query);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkMenuItems();

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function checkParents() {
  try {
    const query = `
      SELECT 
        s.name as item, 
        s.parent_id,
        p.name as parent_name,
        s.feature_id,
        s.permission_required
      FROM sidebar_menu_items s
      LEFT JOIN sidebar_menu_items p ON s.parent_id = p.id
      JOIN system_features f ON s.feature_id = f.id
      JOIN system_feature_modules fm ON f.id = fm.feature_id
      JOIN system_modules m ON fm.module_id = m.id
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

checkParents();

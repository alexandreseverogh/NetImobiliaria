const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function inspectFeatures() {
  try {
    const query = `
      SELECT 
        f.name as feature_name, 
        f.slug, 
        cat.name as category,
        s.name as menu_item,
        s.system_id
      FROM system_features f
      JOIN system_feature_modules fm ON f.id = fm.feature_id
      JOIN system_modules m ON fm.module_id = m.id
      LEFT JOIN system_categorias cat ON f.category_id = cat.id
      LEFT JOIN sidebar_menu_items s ON f.id = s.feature_id
      WHERE m.name = 'Mercado Imobiliário'
      ORDER BY cat.name, f.name
    `;
    const res = await pool.query(query);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

inspectFeatures();

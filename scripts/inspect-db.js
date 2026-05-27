const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost', port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME, user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function inspect() {
  try {
    const res = await pool.query(`
      SELECT 
        table_schema, 
        table_name, 
        column_name, 
        data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('system_features', 'tenant_feature_overrides')
      ORDER BY table_name, ordinal_position;
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally { await pool.end(); }
}

inspect();

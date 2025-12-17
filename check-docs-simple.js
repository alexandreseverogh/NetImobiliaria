require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'net_imobiliaria',
  user: 'postgres',
  password: 'Roberto@2007',
});

(async () => {
  const r = await pool.query("SELECT category, name FROM system_features WHERE category = 'tipos-documentos'");
  console.log('Feature:', r.rows[0]);
  
  const p = await pool.query("SELECT COUNT(*) FROM permissions p JOIN system_features sf ON p.feature_id = sf.id WHERE sf.category = 'tipos-documentos'");
  console.log('Permissões:', p.rows[0].count);
  
  await pool.end();
})();




const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: '127.0.0.1', database: 'net_imobiliaria', password: 'postgres', port: 15432,
});

async function checkMasterPlatform() {
  try {
    // 1. Achar a categoria
    const catRes = await pool.query("SELECT id, name, is_active FROM system_categorias WHERE name ILIKE '%Master Platform%' OR name ILIKE '%Master Governance%'");
    console.log('CATEGORIAS ENCONTRADAS:', catRes.rows);

    if (catRes.rows.length > 0) {
      const catId = catRes.rows[0].id;
      // 2. Ver features dentro
      const featRes = await pool.query("SELECT id, name, slug, is_active, url FROM system_features WHERE category_id = $1", [catId]);
      console.log(`FEATURES NA CATEGORIA ${catRes.rows[0].name}:`, featRes.rows);
    }

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}
checkMasterPlatform();

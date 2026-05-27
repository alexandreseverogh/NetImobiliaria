const pool = require('./src/lib/database/connection').pool;

async function checkTenants() {
  try {
    const query = `
      SELECT t.id, t.name, t.slug, s.name as segment_name, s.color_theme as segment_color 
      FROM tenants t
      LEFT JOIN system_segments s ON t.segment_id = s.id
      WHERE t.status = 'active'
      ORDER BY t.name ASC
    `;
    const result = await pool.query(query);
    console.log('--- RESULTADO DA CONSULTA DE TENANTS ---');
    console.log(JSON.stringify(result.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Erro:', err);
    process.exit(1);
  }
}

checkTenants();

const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres', host: '127.0.0.1', database: 'net_imobiliaria', password: 'postgres', port: 15432,
});

async function findSlugs() {
  try {
    const res = await pool.query(`
      SELECT sf.id, sf.name, sf.slug, sc.name as category 
      FROM system_features sf
      LEFT JOIN system_categorias sc ON sf.category_id = sc.id
      WHERE sc.name IN ('Master Governance', 'Configurações CRM', 'Habilidades')
    `);
    console.log('FEATURES ENCONTRADAS PARA MAPEAMENTO:');
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}
findSlugs();

import { pool } from './src/lib/database/connection.ts';

async function run() {
  try {
    console.log('--- SYSTEM_MODULES ---');
    const modulesRes = await pool.query('SELECT * FROM system_modules ORDER BY name');
    console.log(JSON.stringify(modulesRes.rows, null, 2));

    console.log('\n--- SYSTEM_CATEGORIAS ---');
    const categoriesRes = await pool.query(`
      SELECT sc.id, sc.name, sc.slug, sm.name as module_name, sm.slug as module_slug
      FROM system_categorias sc
      LEFT JOIN system_modules sm ON sc.module_id = sm.id
      ORDER BY sm.name, sc.name
    `);
    console.log(JSON.stringify(categoriesRes.rows, null, 2));

    console.log('\n--- SYSTEM_FEATURES ---');
    const featuresRes = await pool.query(`
      SELECT sf.id, sf.name, sf.slug, sc.name as category_name, sc.slug as category_slug
      FROM system_features sf
      LEFT JOIN system_categorias sc ON sf.category_id = sc.id
      ORDER BY sc.name, sf.name
      LIMIT 30
    `);
    console.log(JSON.stringify(featuresRes.rows, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error running queries:', err);
    process.exit(1);
  }
}

run();

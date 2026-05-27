const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function checkModules() {
  try {
    console.log('--- SEGMENTOS ---');
    const segments = await pool.query('SELECT id, name, slug FROM system_segments');
    console.table(segments.rows);

    console.log('\n--- MÓDULOS ---');
    const modules = await pool.query('SELECT id, name, slug FROM system_modules');
    console.table(modules.rows);

    console.log('\n--- VÍNCULOS SEGMENTO-MÓDULO ---');
    const links = await pool.query(`
      SELECT s.name as segment, m.name as module, smm.is_active
      FROM system_segment_modules smm
      JOIN system_segments s ON smm.segment_id = s.id
      JOIN system_modules m ON smm.module_id = m.id
    `);
    console.table(links.rows);

    console.log('\n--- MÓDULOS DA IMOBILIARIA XYZ ---');
    const xyzRes = await pool.query(`
      SELECT t.name as tenant, m.name as module, tm.is_enabled
      FROM tenant_modules tm
      JOIN tenants t ON tm.tenant_id = t.id
      JOIN system_modules m ON tm.module_id = m.id
      WHERE t.name ILIKE '%XYZ%'
    `);
    console.table(xyzRes.rows);

    // Identificar módulos que estão na XYZ mas não estão no seu segmento
    console.log('\n--- DIAGNÓSTICO: Módulos órfãos no segmento ---');
    const orphans = await pool.query(`
      SELECT t.name as tenant, s.name as segment, m.name as module
      FROM tenants t
      JOIN system_segments s ON t.segment_id = s.id
      JOIN tenant_modules tm ON t.id = tm.tenant_id
      JOIN system_modules m ON tm.module_id = m.id
      LEFT JOIN system_segment_modules smm ON s.id = smm.segment_id AND m.id = smm.module_id
      WHERE smm.module_id IS NULL
      AND t.name ILIKE '%XYZ%'
    `);
    console.table(orphans.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkModules();

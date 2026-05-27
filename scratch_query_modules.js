const pool = require('./src/lib/database/connection').pool;

async function run() {
  try {
    const modulesRes = await pool.query('SELECT id, name, slug, description, icon, is_active FROM system_modules ORDER BY name');
    console.log(JSON.stringify(modulesRes.rows, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('Error running queries:', err);
    process.exit(1);
  }
}

run();

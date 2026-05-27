const pool = require('./src/lib/database/connection').pool;

async function run() {
  try {
    console.log('--- SIDEBAR TABLES ---');
    const tablesRes = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE '%sidebar%'");
    console.log(tablesRes.rows);

    // Let's also query some items from sidebar_menu_items if it exists
    console.log('\n--- SIDEBAR MENU ITEMS ---');
    try {
      const itemsRes = await pool.query('SELECT * FROM sidebar_menu_items ORDER BY order_index');
      console.log(JSON.stringify(itemsRes.rows, null, 2));
    } catch (e) {
      console.log('No sidebar_menu_items table or error:', e.message);
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error running queries:', err);
    process.exit(1);
  }
}

run();

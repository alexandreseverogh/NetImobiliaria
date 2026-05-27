const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '15432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function testSidebarFunction() {
  try {
    console.log('1. Buscando dados do usuário admxyz...');
    const userRes = await pool.query("SELECT id, username FROM users WHERE username = 'admxyz'");
    if (userRes.rows.length === 0) throw new Error('Usuário não encontrado');
    const userId = userRes.rows[0].id;

    const tenantRes = await pool.query(`
      SELECT tenant_id FROM user_tenant_membership WHERE user_id = $1 LIMIT 1
    `, [userId]);
    const tenantId = tenantRes.rows[0]?.tenant_id;

    console.log(`User ID: ${userId}, Tenant ID: ${tenantId}`);

    console.log('2. Chamando public.get_sidebar_menu_for_user...');
    const sidebarRes = await pool.query(`
      SELECT public.get_sidebar_menu_for_user($1, 'admin', $2) as menu
    `, [userId, tenantId]);

    const menu = sidebarRes.rows[0].menu;
    console.log('--- RESULTADO DA SIDEBAR ---');
    console.log(JSON.stringify(menu, null, 2));
    console.log(`\nTotal de itens retornados: ${menu.length}`);

  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

testSidebarFunction();

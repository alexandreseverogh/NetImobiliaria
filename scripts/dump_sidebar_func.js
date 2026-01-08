
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Docker DB (15432)
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function dumpFunc() {
    try {
        const r = await pool.query(`
      SELECT pg_get_functiondef(oid) 
      FROM pg_proc 
      WHERE proname = 'get_sidebar_menu_for_user'
    `);

        if (r.rows.length > 0) {
            console.log("---------------------------------------------------");
            console.log(r.rows[0].pg_get_functiondef);
            console.log("---------------------------------------------------");
        } else {
            console.log("❌ Função não encontrada.");
        }

    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

dumpFunc();

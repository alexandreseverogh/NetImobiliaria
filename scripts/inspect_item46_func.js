
const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function run() {
    try {
        console.log('--- Item 46 Details ---');
        const res = await pool.query(`SELECT * FROM sidebar_menu_items WHERE id = 46`);
        console.table(res.rows);

        console.log('\n--- Function Definition ---');
        const funcRes = await pool.query(`
            SELECT pg_get_functiondef(oid) 
            FROM pg_proc 
            WHERE proname = 'get_sidebar_menu_for_user';
        `);

        if (funcRes.rows.length > 0) {
            fs.writeFileSync('func_def.sql', funcRes.rows[0].pg_get_functiondef);
            console.log('Function definition saved to func_def.sql');
        } else {
            console.log('Function not found');
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

run();

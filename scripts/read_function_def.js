
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

async function readFunction() {
    try {
        const query = `
            SELECT pg_get_functiondef(oid) 
            FROM pg_proc 
            WHERE proname = 'get_sidebar_menu_for_user';
        `;
        const res = await pool.query(query);

        if (res.rows.length === 0) {
            console.log("Function NOT FOUND");
        } else {
            console.log(res.rows[0].pg_get_functiondef);
        }

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

readFunction();

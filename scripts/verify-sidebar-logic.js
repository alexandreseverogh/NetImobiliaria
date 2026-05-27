const { Pool } = require('pg');
const pool = new Pool({ host: '127.0.0.1', port: 15432, user: 'postgres', password: 'postgres', database: 'net_imobiliaria' });

async function check() {
    try {
        const res = await pool.query(`
            SELECT pg_get_functiondef(p.oid) 
            FROM pg_proc p 
            WHERE p.proname = 'get_sidebar_menu_for_user' 
            AND oidvectortypes(p.proargtypes) = 'uuid, text, uuid'
        `);
        console.log(res.rows[0]?.pg_get_functiondef || 'Function not found');
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();

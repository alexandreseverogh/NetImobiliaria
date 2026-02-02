const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost', port: 15432, database: 'net_imobiliaria', user: 'postgres', password: 'postgres'
});

async function run() {
    try {
        console.log('Checking active locks...');
        const q = `
            SELECT 
                pid, 
                query, 
                query_start, 
                state, 
                wait_event_type, 
                wait_event
            FROM pg_stat_activity 
            WHERE state != 'idle' AND query NOT LIKE '%pg_stat_activity%'
        `;
        const res = await pool.query(q);
        console.log(JSON.stringify(res.rows, null, 2));

        console.log('\nChecking locks on table...');
        const q2 = `
            SELECT 
                l.pid, 
                l.mode, 
                l.granted, 
                a.query, 
                a.query_start
            FROM pg_locks l
            JOIN pg_stat_activity a ON l.pid = a.pid
            WHERE l.relation = 'imovel_prospect_atribuicoes'::regclass
        `;
        const res2 = await pool.query(q2);
        console.log(JSON.stringify(res2.rows, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();

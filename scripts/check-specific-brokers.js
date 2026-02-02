const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost', port: 15432, database: 'net_imobiliaria', user: 'postgres', password: 'postgres'
});

async function run() {
    try {
        const res = await pool.query(`
            SELECT id, nome, tipo_corretor, is_plantonista, ativo 
            FROM users 
            WHERE id IN (
                '491795c4-c017-4285-b85a-eb29c26c28b5', 
                '4d456e42-4031-46ba-9b5c-912bec1d28b5', 
                'ebad63d6-c774-40e1-b9c7-0f55b7c1735f', 
                'abd6b94a-fbe9-4a9b-8688-f3ecb142fff3'
            )
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();

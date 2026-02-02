const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function run() {
    try {
        const q = `
            SELECT
                conname AS constraint_name,
                pg_get_constraintdef(c.oid) AS constraint_definition
            FROM
                pg_constraint c
            JOIN
                pg_namespace n ON n.oid = c.connamespace
            WHERE
                conrelid = 'imovel_prospects'::regclass;
        `;
        const res = await pool.query(q);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();

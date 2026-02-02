const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost', port: 15432, database: 'net_imobiliaria', user: 'postgres', password: 'postgres'
});

async function run() {
    try {
        const q = `
            SELECT u.id, u.nome, ur.name as rname, u.ativo, u.is_plantonista, u.tipo_corretor
            FROM users u
            INNER JOIN user_role_assignments ura ON u.id = ura.user_id
            INNER JOIN user_roles ur ON ura.role_id = ur.id
        `;
        const res = await pool.query(q);
        const filtered = res.rows.filter(r =>
            r.ativo === true &&
            r.rname === 'Corretor' &&
            (r.is_plantonista === true) &&
            (r.tipo_corretor === 'Interno' || r.tipo_corretor === null)
        );
        console.log('Total Corretor Role assignments:', res.rowCount);
        console.log('Filtered (Manual):', JSON.stringify(filtered, null, 2));

        const qStrict = `
            SELECT u.id, u.nome FROM users u
            INNER JOIN user_role_assignments ura ON u.id = ura.user_id
            INNER JOIN user_roles ur ON ura.role_id = ur.id
            WHERE u.ativo = true AND ur.name = 'Corretor' AND u.is_plantonista = true
        `;
        const resStrict = await pool.query(qStrict);
        console.log('Strict SQL result:', JSON.stringify(resStrict.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();

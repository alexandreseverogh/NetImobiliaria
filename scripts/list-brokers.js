const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '15432', 10),
    database: process.env.DB_NAME || 'net_imobiliaria',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
});

async function run() {
    try {
        const q = `
            SELECT u.id, u.nome, u.tipo_corretor, ur.name as role_name, COALESCE(u.is_plantonista, false) as is_plantonista
            FROM users u
            INNER JOIN user_role_assignments ura ON u.id = ura.user_id
            INNER JOIN user_roles ur ON ura.role_id = ur.id
            WHERE ur.name = 'Corretor'
        `;
        const res = await pool.query(q);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();

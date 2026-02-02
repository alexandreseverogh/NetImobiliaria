const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost', port: 15432, database: 'net_imobiliaria', user: 'postgres', password: 'postgres'
});

async function run() {
    try {
        console.log('--- DETAILED USER CHECK ---');
        const res = await pool.query(`
            SELECT 
                u.id, 
                u.nome, 
                u.ativo, 
                u.is_plantonista, 
                u.tipo_corretor,
                ur.name as role_name
            FROM users u
            LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
            LEFT JOIN user_roles ur ON ura.role_id = ur.id
            WHERE u.nome ILIKE '%Plantonista%'
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();

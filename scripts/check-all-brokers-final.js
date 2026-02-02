const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost', port: 15432, database: 'net_imobiliaria', user: 'postgres', password: 'postgres'
});

async function run() {
    try {
        console.log('--- ALL BROKERS CLASSIFICATION ---');
        const res = await pool.query(`
            SELECT 
                u.id, 
                u.nome, 
                u.tipo_corretor, 
                u.is_plantonista
            FROM users u
            INNER JOIN user_role_assignments ura ON u.id = ura.user_id
            INNER JOIN user_roles ur ON ura.role_id = ur.id
            WHERE ur.name = 'Corretor'
            ORDER BY u.tipo_corretor, u.nome
        `);
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();

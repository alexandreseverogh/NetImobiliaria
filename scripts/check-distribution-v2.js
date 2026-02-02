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
        console.log('--- START DISTRIBUTION CHECK ---');

        const res = await pool.query(`
            SELECT 
                tipo_corretor, 
                count(*),
                string_agg(nome, ', ') as names
            FROM users u
            INNER JOIN user_role_assignments ura ON u.id = ura.user_id
            INNER JOIN user_roles ur ON ura.role_id = ur.id
            WHERE ur.name = 'Corretor'
            GROUP BY tipo_corretor
        `);
        console.log(JSON.stringify(res.rows, null, 2));

        console.log('\n--- TARGET BROKERS ---');
        const jose = await pool.query("SELECT id, nome, tipo_corretor, is_plantonista FROM users WHERE nome ILIKE '%Jose Damasio Neto%' OR nome ILIKE '%Maria Silva%'");
        console.log(JSON.stringify(jose.rows, null, 2));

        console.log('--- END DISTRIBUTION CHECK ---');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost', port: 15432, database: 'net_imobiliaria', user: 'postgres', password: 'postgres'
});

async function run() {
    try {
        const res = await pool.query(`
            SELECT u.nome, u.tipo_corretor, caa.cidade_fk, u.ativo, ur.name as role
            FROM users u 
            JOIN corretor_areas_atuacao caa ON u.id = caa.corretor_fk 
            JOIN user_role_assignments ura ON u.id = ura.user_id
            JOIN user_roles ur ON ura.role_id = ur.id
            WHERE caa.cidade_fk = 'Goiana'
        `);
        console.table(res.rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();

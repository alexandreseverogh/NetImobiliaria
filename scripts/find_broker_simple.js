
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function findBroker() {
    try {
        // Buscar id de qualquer usuário com perfil de corretor
        const res = await pool.query(`
      SELECT u.id, u.nome, ur.name as role_name 
      FROM users u 
      JOIN user_role_assignments ura ON u.id = ura.user_id 
      JOIN user_roles ur ON ura.role_id = ur.id 
      WHERE ur.name LIKE '%Corretor%' 
      LIMIT 1
    `);

        if (res.rows.length > 0) {
            console.log('UUID:', res.rows[0].id);
            console.log('NAME:', res.rows[0].nome);
        } else {
            console.log('NO_BROKER_FOUND');
        }
    } catch (e) { console.error(e); }
    pool.end();
}
findBroker();

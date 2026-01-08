
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
        const res = await pool.query(`
      SELECT u.id, u.nome, u.email 
      FROM users u 
      JOIN user_role_assignments ura ON u.id = ura.user_id 
      JOIN user_roles ur ON ura.role_id = ur.id 
      WHERE ur.name IN ('Corretor', 'Corretor Interno', 'Corretor Externo', 'Admin') 
      LIMIT 10
    `);
        console.table(res.rows);
    } catch (e) { console.error(e); }
    pool.end();
}
findBroker();

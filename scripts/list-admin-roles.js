const { Pool } = require('pg');
const pool = new Pool({ host: '127.0.0.1', port: 15432, user: 'postgres', password: 'postgres', database: 'net_imobiliaria' });

async function check() {
    try {
        const res = await pool.query(`
            SELECT u.username, r.name as role_name, r.is_system_role, r.level 
            FROM users u 
            JOIN user_role_assignments ura ON u.id = ura.user_id 
            JOIN user_roles r ON ura.role_id = r.id 
            WHERE u.username = 'admin'
        `);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();

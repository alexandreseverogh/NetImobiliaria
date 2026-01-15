
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function checkCorretorRole() {
    try {
        const res = await pool.query("SELECT * FROM user_roles WHERE name = 'Corretor'");
        console.log('PERFIL CORRETOR:');
        console.table(res.rows);
        await pool.end();
    } catch (err) {
        console.error('Erro ao consultar perfil:', err);
        await pool.end();
    }
}

checkCorretorRole();

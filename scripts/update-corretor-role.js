
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function updateCorretorRole() {
    try {
        const res = await pool.query("UPDATE user_roles SET requires_2fa = true WHERE name = 'Corretor'");
        console.log(`UPDATE REALIZADO. Linhas afetadas: ${res.rowCount}`);
        await pool.end();
    } catch (err) {
        console.error('Erro ao atualizar perfil:', err);
        await pool.end();
    }
}

updateCorretorRole();

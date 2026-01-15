const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432, // Porta do Docker
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres', // Senha padrão do Docker compose
});

const CORRETOR_ID = '43b2242a-cbea-4696-9e29-3987211188a3';

async function main() {
    try {
        console.log('Tentando conectar na porta 15432...');
        const res = await pool.query('SELECT id, nome, email FROM users WHERE id = $1', [CORRETOR_ID]);
        if (res.rows.length === 0) {
            console.log('❌ Usuário não encontrado com esse ID (mesmo na 15432).');
        } else {
            console.log('✅ Usuário encontrado na 15432:', res.rows[0]);
        }

    } catch (err) {
        console.error('Erro de conexão na 15432:', err.message);
    } finally {
        pool.end();
    }
}

main();

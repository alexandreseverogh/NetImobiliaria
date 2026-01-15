const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'net_imobiliaria',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Roberto@2007',
});

const CORRETOR_ID = '43b2242a-cbea-4696-9e29-3987211188a3';

async function main() {
    try {
        const res = await pool.query('SELECT id, nome, email FROM users WHERE id = $1', [CORRETOR_ID]);
        if (res.rows.length === 0) {
            console.log('❌ Usuário não encontrado com esse ID.');
        } else {
            console.log('✅ Usuário encontrado:', res.rows[0]);
        }

        // Listar últimas 5 atribuições gerais para ver se tem ALGO
        const last = await pool.query('SELECT * FROM imovel_prospect_atribuicoes ORDER BY created_at DESC LIMIT 5');
        console.log('Últimas 5 atribuições no sistema:', JSON.stringify(last.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

main();

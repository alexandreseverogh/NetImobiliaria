
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function checkClient() {
    try {
        const prospectId = 31;

        // 1. Get Prospect Client ID
        const pRes = await pool.query('SELECT id, id_cliente FROM imovel_prospects WHERE id = $1', [prospectId]);
        if (pRes.rows.length === 0) {
            console.log('Prospect 31 não encontrado.');
            await pool.end();
            return;
        }
        const clientId = pRes.rows[0].id_cliente;
        console.log(`Prospect 31 tem id_cliente: ${clientId}`);

        if (clientId) {
            // 2. Check Client Table
            const cRes = await pool.query('SELECT uuid, nome, email FROM clientes WHERE uuid = $1::uuid', [clientId]);
            if (cRes.rows.length === 0) {
                console.log('❌ CLIENTE NÃO ENCONTRADO NA TABELA CLIENTES!');
            } else {
                console.log('✅ Cliente encontrado:', cRes.rows[0]);
            }
        } else {
            console.log('❌ Prospect sem id_cliente!');
        }

        await pool.end();
    } catch (err) {
        console.error('Erro:', err);
        await pool.end();
    }
}

checkClient();

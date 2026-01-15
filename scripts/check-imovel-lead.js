
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function checkImovelStatus() {
    const prospectId = 29;

    try {
        // 1. Get Imovel ID from Prospect
        const pRes = await pool.query('SELECT id_imovel FROM imovel_prospects WHERE id = $1', [prospectId]);
        if (pRes.rows.length === 0) {
            console.log('Prospect não encontrado.');
            await pool.end();
            return;
        }
        const imovelId = pRes.rows[0].id_imovel;
        console.log(`Prospect ${prospectId} refere-se ao Imóvel ${imovelId}`);

        // 2. Check Imovel status
        const iRes = await pool.query('SELECT id, corretor_fk, titulo FROM imoveis WHERE id = $1', [imovelId]);
        if (iRes.rows.length === 0) {
            console.log('Imóvel não encontrado.');
        } else {
            console.log('Dados do Imóvel:', iRes.rows[0]);
        }

        await pool.end();
    } catch (err) {
        console.error('Erro:', err);
        await pool.end();
    }
}

checkImovelStatus();

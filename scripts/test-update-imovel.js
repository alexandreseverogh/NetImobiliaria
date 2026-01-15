
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function testUpdateImovel() {
    const brokerId = '43b2242a-cbea-4696-9e29-3987211188a3';
    const prospectId = 29;

    try {
        console.log(`Tentando vincular Imóvel do prospect ${prospectId} ao corretor ${brokerId}...`);

        // Mesma query da rota
        const res = await pool.query(`
        UPDATE imoveis i
        SET corretor_fk = $1::uuid
        FROM imovel_prospects ip
        WHERE ip.id = $2
          AND ip.id_imovel = i.id
          AND i.corretor_fk IS NULL
          RETURNING i.id, i.titulo, i.corretor_fk
    `, [brokerId, prospectId]);

        if (res.rows.length > 0) {
            console.log('✅ SUCESSO! Imóvel atualizado:', res.rows[0]);
        } else {
            console.log('❌ FALHA! Nenhuma linha atualizada. (Imóvel já tem dono ou prospect incorreto)');
        }

        await pool.end();
    } catch (err) {
        console.error('Erro:', err);
        await pool.end();
    }
}

testUpdateImovel();

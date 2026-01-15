
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function acceptLead31() {
    const brokerId = '43b2242a-cbea-4696-9e29-3987211188a3';
    const prospectId = 31;

    try {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Update Status
            const res = await client.query(`
        UPDATE imovel_prospect_atribuicoes
        SET status = 'aceito', data_aceite = NOW()
        WHERE prospect_id = $1 AND corretor_fk = $2 AND status = 'atribuido'
        RETURNING id
      `, [prospectId, brokerId]);

            if (res.rows.length === 0) {
                throw new Error('Falha ao aceitar lead (não encontrado ou já aceito/expirado)');
            }
            console.log('✅ Status atualizado para ACEITO.');

            // 2. Update Imovel
            const iRes = await client.query(`
        UPDATE imoveis i
        SET corretor_fk = $1::uuid
        FROM imovel_prospects ip
        WHERE ip.id = $2
          AND ip.id_imovel = i.id
          AND i.corretor_fk IS NULL
        RETURNING i.id, i.titulo
      `, [brokerId, prospectId]);

            if (iRes.rows.length > 0) {
                console.log(`✅ Imóvel vinculado ao corretor: ${iRes.rows[0].id} - ${iRes.rows[0].titulo}`);
            } else {
                console.log('⚠️ Imóvel NÃO foi vinculado (já tem dono ou erro no join).');
            }

            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    } catch (err) {
        console.error('Erro na simulação:', err);
    } finally {
        await pool.end();
    }
}

acceptLead31();

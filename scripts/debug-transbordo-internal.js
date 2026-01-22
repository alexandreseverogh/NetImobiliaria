const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
});

const IMOVEL_ID = 145;

async function debugInternalTransbordo() {
    try {
        const client = await pool.connect();

        console.log('--- DIAGNÓSTICO TRANSBORDO INTERNO ---');

        // 1. Ler parâmetros
        const params = await client.query('SELECT proximos_corretores_recebem_leads_internos FROM parametros limit 1');
        const limitInternal = params.rows[0]?.proximos_corretores_recebem_leads_internos;
        console.log(`Parametro Limit Interno: ${limitInternal}`);

        // 2. Ler Imóvel para pegar Cidade/Estado
        const imovel = await client.query(`SELECT id, codigo, estado_fk, cidade_fk FROM imoveis WHERE id = $1`, [IMOVEL_ID]);
        if (imovel.rows.length === 0) { console.log('Imovel não encontrado'); return; }
        const { estado_fk, cidade_fk } = imovel.rows[0];
        console.log(`Imóvel ${IMOVEL_ID}: Estado=${estado_fk}, Cidade=${cidade_fk}`);

        // 3. Listar TODOS os corretores INTERNOS elegíveis nessa área
        const queryInternos = `
      SELECT u.id, u.nome, u.email, u.tipo_corretor
      FROM users u
      JOIN corretor_areas_atuacao caa ON caa.corretor_fk = u.id
      WHERE u.ativo = true
      AND u.tipo_corretor = 'Interno'
      AND COALESCE(u.is_plantonista, false) = false
      AND caa.estado_fk = $1
      AND caa.cidade_fk = $2
    `;
        const internos = await client.query(queryInternos, [estado_fk, cidade_fk]);

        console.log(`\nTotal de Corretores Internos na Área: ${internos.rows.length}`);
        internos.rows.forEach((rows, i) => {
            console.log(`  ${i + 1}. ${rows.nome} (${rows.email}) [${rows.id}]`);
        });

        // 4. Ver histórico de atribuições desse imóvel (via prospect)
        // Precisamos achar o prospect associado a este imóvel.
        const prospect = await client.query('SELECT id FROM imovel_prospects WHERE id_imovel = $1 ORDER BY created_at DESC LIMIT 1', [IMOVEL_ID]);
        if (prospect.rows.length > 0) {
            const prospectId = prospect.rows[0].id;
            console.log(`\nProspect ID encontrado: ${prospectId}`);

            const history = await client.query(`
            SELECT pa.corretor_fk, pa.status, pa.created_at, u.nome, u.tipo_corretor, u.is_plantonista
            FROM imovel_prospect_atribuicoes pa
            LEFT JOIN users u ON u.id = pa.corretor_fk
            WHERE pa.prospect_id = $1
            ORDER BY pa.created_at ASC
        `, [prospectId]);

            console.log(`Histórico de Atribuições (${history.rows.length}):`);
            history.rows.forEach((h, i) => {
                console.log(`  ${i + 1}. ${h.nome} (${h.tipo_corretor} - Plantonista:${h.is_plantonista}) - Status: ${h.status}`);
            });
        }

        client.release();

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await pool.end();
    }
}

debugInternalTransbordo();

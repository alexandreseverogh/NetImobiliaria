
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: 15432
});

const PROSPECT_ID = 51;
const IMOVEL_ID = 145; // As per context

async function run() {
    const client = await pool.connect();
    try {
        console.log('--- DIAGNOSTICO PROSPECT 51 ---');

        // 1. Get Location
        const iRes = await client.query('SELECT estado_fk, cidade_fk FROM imoveis WHERE id = $1', [IMOVEL_ID]);
        const { estado_fk, cidade_fk } = iRes.rows[0];
        console.log(`Local: ${cidade_fk} / ${estado_fk}`);

        // 2. Used Brokers
        const hRes = await client.query('SELECT corretor_fk FROM imovel_prospect_atribuicoes WHERE prospect_id = $1', [PROSPECT_ID]);
        const excludeIds = hRes.rows.map(r => r.corretor_fk);
        console.log('Já receberam:', excludeIds);

        // 3. List ALL Internals in Area (Raw Inspection)
        const qRaw = `
      SELECT u.id, u.nome, u.tipo_corretor, u.is_plantonista, u.ativo
      FROM users u
      JOIN corretor_areas_atuacao caa ON caa.corretor_fk = u.id
      WHERE caa.estado_fk = $1 AND caa.cidade_fk = $2
      AND u.tipo_corretor = 'Interno'
    `;
        const allInternals = await client.query(qRaw, [estado_fk, cidade_fk]);
        console.log(`\nTODOS Internos na área (${allInternals.rows.length}):`);
        allInternals.rows.forEach(u => {
            const excluded = excludeIds.includes(u.id) ? '[EXCLUIDO]' : '[DISPONIVEL]';
            console.log(` - ${u.nome} (${u.id}) isPlan:${u.is_plantonista} Ativo:${u.ativo} ${excluded}`);
        });

        // 4. Simulate Query
        const qSim = `
      SELECT u.id, u.nome
      FROM public.users u
      INNER JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
      WHERE u.ativo = true
        AND COALESCE(u.is_plantonista, false) = false
        AND COALESCE(u.tipo_corretor, 'Externo') = 'Interno'
        AND caa.estado_fk = $1
        AND caa.cidade_fk = $2
        AND u.id != ALL($3::uuid[])
      LIMIT 5
    `;
        const simRes = await client.query(qSim, [estado_fk, cidade_fk, excludeIds]);
        console.log(`\nSimulação 'pickInternalBrokerByArea' encontraria: ${simRes.rows.length}`);
        simRes.rows.forEach(r => console.log(` >> ${r.nome}`));

    } catch (e) {
        console.error(e);
    } finally {
        client.release();
        pool.end();
    }
}

run();

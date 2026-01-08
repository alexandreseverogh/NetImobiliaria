
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function simulate() {
    const prospectId = 3;
    console.log(`🔍 Simulating Transbordo for Prospect ID: ${prospectId}`);

    try {
        // 1. Get Prospect Data
        const pRes = await pool.query(`
      SELECT i.estado_fk, i.cidade_fk 
      FROM imovel_prospects ip 
      JOIN imoveis i ON ip.id_imovel = i.id 
      WHERE ip.id = $1
    `, [prospectId]);

        if (pRes.rows.length === 0) {
            console.log('❌ Prospect not found');
            return;
        }
        const { estado_fk, cidade_fk } = pRes.rows[0];
        console.log(`📍 Location: ${cidade_fk} / ${estado_fk}`);

        // 2. Simulate pickBrokerByArea Logic
        // Copy-pasted SQL from prospectRouter.ts
        const q = `
        SELECT
        u.id, u.nome, u.email,
        COUNT(a.id) AS total_recebidos,
        MAX(a.created_at) AS ultimo_recebimento
        FROM public.users u
        INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
        INNER JOIN public.user_roles ur ON ura.role_id = ur.id
        INNER JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
        LEFT JOIN public.imovel_prospect_atribuicoes a ON a.corretor_fk = u.id
        WHERE u.ativo = true
        AND ur.name LIKE '%Corretor%' -- Adjusted for loose match or multiple roles
        AND COALESCE(u.is_plantonista, false) = false
        AND caa.estado_fk = $1
        AND caa.cidade_fk = $2
        GROUP BY u.id, u.nome, u.email
        ORDER BY COUNT(a.id) ASC, MAX(a.created_at) ASC NULLS FIRST, u.created_at ASC
        LIMIT 1
    `;

        console.log('--- Attempting Area Match ---');
        const areaRes = await pool.query(q, [estado_fk, cidade_fk]);

        if (areaRes.rows.length > 0) {
            const b = areaRes.rows[0];
            console.log('✅ WINNER (Area Match):', b.nome);
            console.log('   ID:', b.id);
            console.log('   Email:', b.email);
            console.log('   Total Leads:', b.total_recebidos);
        } else {
            console.log('⚠️ No broker found for this area.');
        }

    } catch (e) { console.error('Error:', e); }
    pool.end();
}
simulate();

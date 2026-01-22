const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: 15432,
});

const IMOVEL_ID = 145;

async function simulate() {
    try {
        console.log('--- SIMULAÇÃO DE ROTEAMENTO (INTERNAL) ---');
        const client = await pool.connect();

        // 1. Params
        const pRes = await client.query('SELECT proximos_corretores_recebem_leads_internos FROM parametros LIMIT 1');
        const limitInternal = pRes.rows[0].proximos_corretores_recebem_leads_internos;
        console.log(`Limite Interno Configurado: ${limitInternal}`);

        // 2. Imovel Info
        const iRes = await client.query('SELECT estado_fk, cidade_fk FROM imoveis WHERE id = $1', [IMOVEL_ID]);
        const { estado_fk, cidade_fk } = iRes.rows[0];
        console.log(`Local do Imóvel: ${cidade_fk} - ${estado_fk}`);

        // 3. Get Prospect History
        const prosRes = await client.query('SELECT id FROM imovel_prospects WHERE id_imovel = $1 ORDER BY created_at DESC LIMIT 1', [IMOVEL_ID]);
        if (prosRes.rows.length === 0) {
            console.log('❌ NENHUM Prospect encontrado para este imóvel.');
            client.release();
            return;
        }
        const prospectId = prosRes.rows[0].id;
        console.log(`Prospect Atual: ${prospectId}`);

        const histRes = await client.query('SELECT corretor_fk FROM imovel_prospect_atribuicoes WHERE prospect_id = $1', [prospectId]);
        const excludeIds = histRes.rows.map(r => r.corretor_fk);
        console.log(`Excluídos (Histórico):`, excludeIds);

        // 4. Simulate pickInternalBrokerByArea
        console.log(`\nSimulando pickInternalBrokerByArea com excludeIds...`);

        const q = `
    SELECT
      u.id, u.nome, u.email,
      COALESCE(cs.nivel, 0) as nivel,
      COALESCE(cs.xp_total, 0) as xp
    FROM public.users u
    INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
    INNER JOIN public.user_roles ur ON ura.role_id = ur.id
    INNER JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
    LEFT JOIN public.corretor_scores cs ON cs.user_id = u.id
    WHERE u.ativo = true
      AND ur.name = 'Corretor'
      AND COALESCE(u.is_plantonista, false) = false
      AND COALESCE(u.tipo_corretor, 'Externo') = 'Interno'
      AND caa.estado_fk = $1
      AND caa.cidade_fk = $2
      AND (CASE WHEN array_length($3::uuid[], 1) > 0 THEN u.id != ALL($3::uuid[]) ELSE true END)
    ORDER BY 
      COALESCE(cs.nivel, 0) DESC,
      COALESCE(cs.xp_total, 0) DESC,
      u.created_at ASC
    LIMIT 5
  `;

        // NOTE: Simulating the DB query exactly as in prospectRouter.ts (minus 'total_recebidos' sort for simplicity, but logic matches)
        // Actually, I should match exact query to see if ORDER BY or GROUP BY is helping hide someone.

        const simRes = await client.query(q, [estado_fk, cidade_fk, excludeIds]);

        console.log(`\nCandidatos Internos Encontrados (${simRes.rows.length}):`);
        simRes.rows.forEach(r => {
            console.log(` - ${r.nome} (${r.email}) [${r.id}]`);
        });

        if (simRes.rows.length === 0) {
            console.log('\n❌ NENHUM candidato encontrado. O sistema irá para o Fallback Plantonista.');
        } else {
            console.log(`\n✅ Próximo a receber seria: ${simRes.rows[0].nome}`);
        }

        client.release();
    } catch (e) {
        console.error(e);
    } finally {
        pool.end();
    }
}

simulate();

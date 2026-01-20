const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '15432'),
    ssl: false
});

async function diagnose() {
    try {
        console.log('--- DIAGNOSTIC TRANSBORDO SKIP ---');

        // 1. Check Parameters
        const paramsRes = await pool.query('SELECT proximos_corretores_recebem_leads FROM parametros LIMIT 1');
        console.log('⚙️ Limit (attempts):', paramsRes.rows[0]?.proximos_corretores_recebem_leads);

        // 2. Check Property 145
        const propRes = await pool.query('SELECT id, corretor_fk, cidade_fk, estado_fk FROM imoveis WHERE id = 145');
        const prop = propRes.rows[0];
        console.log('🏠 Property 145:', prop);

        // 3. Check Broker B (The one skipped)
        const brokerBUuid = 'c57ab897-c068-46a4-9b12-bb9f2d938fe7';
        const brokerBRes = await pool.query(`
        SELECT u.id, u.nome, u.email, u.ativo, u.tipo_corretor, u.is_plantonista
        FROM users u 
        WHERE u.id = $1
    `, [brokerBUuid]);
        console.log('👤 Broker B Status:', brokerBRes.rows[0]);

        // 4. Check Broker B Areas
        const areaRes = await pool.query(`
        SELECT cidade_fk, estado_fk 
        FROM corretor_areas_atuacao 
        WHERE corretor_fk = $1
    `, [brokerBUuid]);
        console.log('🗺️ Broker B Areas:', areaRes.rows);

        // 5. SIMULATE QUERY - using the exact SQL from prospectRouter.ts (approx)
        // We assume Broker A '9c89c838-e989-46e1-a358-6a564ae15034' is excluded.
        const excludeIds = ['9c89c838-e989-46e1-a358-6a564ae15034'];

        console.log('🔎 Simulating pickBrokerByArea with exclusions:', excludeIds);

        const q = `
    SELECT
      u.id, u.nome, u.email,
      COALESCE(cs.nivel, 0) as nivel,
      COALESCE(cs.xp_total, 0) as xp,
      COUNT(a.id) AS total_recebidos,
      MAX(a.created_at) AS ultimo_recebimento
    FROM public.users u
    INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
    INNER JOIN public.user_roles ur ON ura.role_id = ur.id
    INNER JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
    LEFT JOIN public.corretor_scores cs ON cs.user_id = u.id
    LEFT JOIN public.imovel_prospect_atribuicoes a ON a.corretor_fk = u.id
    WHERE u.ativo = true
      AND ur.name = 'Corretor'
      AND COALESCE(u.is_plantonista, false) = false
      AND COALESCE(u.tipo_corretor, 'Externo') = 'Externo'
      AND caa.estado_fk = $1
      AND caa.cidade_fk = $2
      AND (CASE WHEN array_length($3::uuid[], 1) > 0 THEN u.id != ALL($3::uuid[]) ELSE true END)
    GROUP BY u.id, u.nome, u.email, cs.nivel, cs.xp_total
    ORDER BY 
      COALESCE(cs.nivel, 0) DESC,
      COALESCE(cs.xp_total, 0) DESC,
      COUNT(a.id) ASC, 
      MAX(a.created_at) ASC NULLS FIRST, 
      u.created_at ASC
    LIMIT 5
  `;

        const simRes = await pool.query(q, [prop.estado_fk, prop.cidade_fk, excludeIds]);

        if (simRes.rows.length === 0) {
            console.log('❌ Simulation returned NO brokers.');
        } else {
            console.log('✅ Simulation returned:', simRes.rows);
            const found = simRes.rows.find(r => r.id === brokerBUuid);
            if (found) console.log('✅ Broker B IS in the list!');
            else console.log('❌ Broker B is NOT in the top list.');
        }

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await pool.end();
    }
}

diagnose();

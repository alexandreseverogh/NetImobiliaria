const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost', port: 15432, database: 'net_imobiliaria', user: 'postgres', password: 'postgres'
});

async function run() {
    const prospectId = 85;
    try {
        console.log(`--- DEEP DEBUG ROUTING FOR PROSPECT ${prospectId} ---`);

        const dataQuery = await pool.query(`
            SELECT ip.id, i.id as imovel_id, i.cidade_fk, i.estado_fk, i.corretor_fk 
            FROM imovel_prospects ip
            INNER JOIN imoveis i ON ip.id_imovel = i.id
            WHERE ip.id = $1
        `, [prospectId]);

        if (dataQuery.rows.length === 0) {
            console.error('Prospect not found');
            return;
        }

        const p = dataQuery.rows[0];
        console.log('Prospect Data:', JSON.stringify(p, null, 2));

        const estado = String(p.estado_fk || '').trim();
        const cidade = String(p.cidade_fk || '').trim();

        // Testing External
        console.log(`\nTesting External for ${cidade}/${estado}...`);
        const qExt = `
            SELECT u.id, u.nome
            FROM public.users u
            INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
            INNER JOIN public.user_roles ur ON ura.role_id = ur.id
            INNER JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
            WHERE u.ativo = true
              AND ur.name = 'Corretor'
              AND COALESCE(u.is_plantonista, false) = false
              AND (u.tipo_corretor = 'Externo' OR u.tipo_corretor IS NULL)
              AND caa.estado_fk = $1
              AND caa.cidade_fk = $2
            LIMIT 1
        `;
        const resExt = await pool.query(qExt, [estado, cidade]);
        console.log('External Result:', resExt.rowCount);

        // Testing Internal
        console.log(`\nTesting Internal for ${cidade}/${estado}...`);
        const qInt = `
            SELECT u.id, u.nome
            FROM public.users u
            INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
            INNER JOIN public.user_roles ur ON ura.role_id = ur.id
            INNER JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
            WHERE u.ativo = true
              AND ur.name = 'Corretor'
              AND COALESCE(u.is_plantonista, false) = false
              AND u.tipo_corretor = 'Interno'
              AND caa.estado_fk = $1
              AND caa.cidade_fk = $2
            LIMIT 1
        `;
        const resInt = await pool.query(qInt, [estado, cidade]);
        console.log('Internal Result:', resInt.rowCount);

        // Testing Plantonista
        console.log(`\nTesting Plantonista Global...`);
        const qGlobal = `
            SELECT u.id, u.nome, u.email
            FROM public.users u
            INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
            INNER JOIN public.user_roles ur ON ura.role_id = ur.id
            WHERE u.ativo = true
              AND ur.name = 'Corretor'
              AND COALESCE(u.is_plantonista, false) = true
              AND COALESCE(u.tipo_corretor, 'Interno') = 'Interno'
            LIMIT 1
        `;
        const resPla = await pool.query(qGlobal);
        console.log('Plantonista Result:', resPla.rowCount);
        if (resPla.rowCount > 0) {
            console.log('Plantonista found:', resPla.rows[0].nome);

            // Attempting to create assignment
            console.log('\nAttempting to INSERT assignment...');
            try {
                const insertRes = await pool.query(`
                    INSERT INTO public.imovel_prospect_atribuicoes (prospect_id, corretor_fk, status, motivo, expira_em, data_aceite)
                    VALUES ($1, $2::uuid, 'aceito', '{"type": "debug_manual"}'::jsonb, null, NOW())
                    RETURNING id
                `, [prospectId, resPla.rows[0].id]);
                console.log('✅ Assignment CREATED! ID:', insertRes.rows[0].id);
            } catch (err) {
                console.error('❌ Failed to create assignment:', err.message);
                if (err.detail) console.error('Detail:', err.detail);
            }
        }

    } catch (e) {
        console.error('ERROR:', e);
    } finally {
        await pool.end();
    }
}
run();

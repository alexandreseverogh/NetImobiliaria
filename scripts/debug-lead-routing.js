const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '15432', 10),
    database: process.env.DB_NAME || 'net_imobiliaria',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
});

async function run() {
    try {
        console.log('--- DEBUG: Checking Recent Leads ---');
        const leads = await pool.query(`
            SELECT 
                ip.id, 
                i.cidade_fk, 
                i.estado_fk, 
                ip.created_at 
            FROM imovel_prospects ip
            INNER JOIN imoveis i ON ip.id_imovel = i.id
            ORDER BY ip.created_at DESC 
            LIMIT 5
        `);
        console.table(leads.rows);

        if (leads.rows.length > 0) {
            const lead = leads.rows[0];
            console.log(`\n--- DEBUG: Simulating routing for Lead ID ${lead.id} (${lead.cidade_fk}/${lead.estado_fk}) ---`);

            console.log('\n1. Checking External Brokers in this area:');
            const qExternal = `
                SELECT
                  u.id, u.nome, u.email, u.tipo_corretor,
                  caa.cidade_fk, caa.estado_fk
                FROM public.users u
                INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
                INNER JOIN public.user_roles ur ON ura.role_id = ur.id
                INNER JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
                WHERE u.ativo = true
                  AND ur.name = 'Corretor'
                  AND COALESCE(u.is_plantonista, false) = false
                  AND (COALESCE(u.tipo_corretor, 'Externo') = 'Externo' OR u.tipo_corretor IS NULL)
                  AND caa.estado_fk = $1
                  AND caa.cidade_fk = $2
            `;
            const externals = await pool.query(qExternal, [lead.estado_fk, lead.cidade_fk]);
            console.table(externals.rows);

            if (externals.rows.length === 0) {
                console.log('No external brokers found exactly matching city/state.');

                console.log('\n2. Listing ALL External Brokers with Areas (to check for mismatches):');
                const allExternals = await pool.query(`
                    SELECT
                      u.nome, u.email, u.tipo_corretor,
                      caa.cidade_fk, caa.estado_fk
                    FROM public.users u
                    INNER JOIN public.user_role_assignments ura ON u.id = ura.user_id
                    INNER JOIN public.user_roles ur ON ura.role_id = ur.id
                    LEFT JOIN public.corretor_areas_atuacao caa ON caa.corretor_fk = u.id
                    WHERE u.ativo = true
                      AND ur.name = 'Corretor'
                      AND COALESCE(u.is_plantonista, false) = false
                      AND (COALESCE(u.tipo_corretor, 'Externo') = 'Externo' OR u.tipo_corretor IS NULL)
                    LIMIT 20
                `);
                console.table(allExternals.rows);
            }
        }
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();

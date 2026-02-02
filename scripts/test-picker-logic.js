const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost', port: 15432, database: 'net_imobiliaria', user: 'postgres', password: 'postgres'
});

async function run() {
    try {
        console.log('--- FINDING DUPLICATES BY NAME ---');
        const dups = await pool.query(`
            SELECT nome, count(*), string_agg(id::text, ', ') as ids
            FROM users
            GROUP BY nome
            HAVING count(*) > 1
        `);
        console.log(JSON.stringify(dups.rows, null, 2));

        console.log('\n--- TESTING pickNextBrokerByAreaExternal EXACT QUERY ---');
        // Recife/PE as used in Prospect 76
        const estado = 'PE';
        const cidade = 'Recife';
        const prospectId = 76; // Just for completeness in NOT IN check

        const q = `
            SELECT
                u.id, u.nome, u.tipo_corretor,
                COALESCE(u.is_plantonista, false) as is_plantonista
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
        `;
        const res = await pool.query(q, [estado, cidade]);
        console.log(`Found ${res.rows.length} brokers matching External criteria:`);
        console.log(JSON.stringify(res.rows, null, 2));

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();

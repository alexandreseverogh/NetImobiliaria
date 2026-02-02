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
        console.log('--- DIAGNOSIS: External Brokers Status ---');

        // 1. Count External Brokers
        const countRes = await pool.query(`
            SELECT count(*) 
            FROM users u
            INNER JOIN user_role_assignments ura ON u.id = ura.user_id
            INNER JOIN user_roles ur ON ura.role_id = ur.id
            WHERE ur.name = 'Corretor'
              AND COALESCE(u.is_plantonista, false) = false
              AND (COALESCE(u.tipo_corretor, 'Externo') = 'Externo' OR u.tipo_corretor IS NULL)
        `);
        console.log(`Total Eligible External Brokers found: ${countRes.rows[0].count}`);

        // 2. Sample first 10 External Brokers and their Areas
        const q = `
            SELECT 
                u.id, 
                u.nome, 
                u.email, 
                u.ativo,
                u.tipo_corretor,
                STRING_AGG(DISTINCT caa.cidade_fk || '/' || caa.estado_fk, ', ') as areas_atuacao
            FROM users u
            INNER JOIN user_role_assignments ura ON u.id = ura.user_id
            INNER JOIN user_roles ur ON ura.role_id = ur.id
            LEFT JOIN corretor_areas_atuacao caa ON caa.corretor_fk = u.id
            WHERE ur.name = 'Corretor'
              AND COALESCE(u.is_plantonista, false) = false
              AND (COALESCE(u.tipo_corretor, 'Externo') = 'Externo' OR u.tipo_corretor IS NULL)
            GROUP BY u.id, u.nome, u.email, u.ativo, u.tipo_corretor
            LIMIT 10
        `;

        const res = await pool.query(q);
        console.table(res.rows);

        if (res.rows.length === 0) {
            console.log('WARNING: No External Brokers found in the database based on the query criteria!');
            console.log('Query Criteria used:');
            console.log("  - Role: 'Corretor'");
            console.log("  - is_plantonista: false (or null)");
            console.log("  - tipo_corretor: 'Externo' (or null)");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

run();

const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost', port: 15432, database: 'net_imobiliaria', user: 'postgres', password: 'postgres'
});

async function run() {
    try {
        console.log('--- DEBUGGING PROPERTY 145 ---');

        // 1. Check Property 145
        const imovel = await pool.query("SELECT id, codigo, cidade_fk, estado_fk, corretor_fk FROM imoveis WHERE id = 145");
        console.log('Property 145:', JSON.stringify(imovel.rows, null, 2));

        if (!imovel.rows.length) {
            console.error('❌ Property 145 not found!');
        }

        // 2. Check Prospects for 145
        const prospects = await pool.query("SELECT id, id_cliente, created_at FROM imovel_prospects WHERE id_imovel = 145 ORDER BY created_at DESC");
        console.log(`\nProspects for 145 (${prospects.rowCount}):`);
        console.table(prospects.rows);

        if (prospects.rowCount > 0) {
            const lastId = prospects.rows[0].id;
            // 3. Check Assignments for the last prospect
            const assignments = await pool.query("SELECT * FROM imovel_prospect_atribuicoes WHERE prospect_id = $1", [lastId]);
            console.log(`\nAssignments for Prospect ${lastId} (${assignments.rowCount}):`);
            console.table(assignments.rows);
        }

        // 4. Check for any brokers in that city/state
        if (imovel.rows.length > 0) {
            const { cidade_fk, estado_fk } = imovel.rows[0];
            const brokers = await pool.query(`
                SELECT u.nome, u.tipo_corretor, u.ativo, ura.role_id
                FROM users u
                JOIN user_role_assignments ura ON u.id = ura.user_id
                JOIN user_roles ur ON ura.role_id = ur.id
                JOIN corretor_areas_atuacao caa ON caa.corretor_fk = u.id
                WHERE caa.cidade_fk = $1 AND caa.estado_fk = $2
                  AND ur.name = 'Corretor'
            `, [cidade_fk, estado_fk]);
            console.log(`\nBrokers in ${cidade_fk}/${estado_fk}:`);
            console.table(brokers.rows);
        }

    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
run();

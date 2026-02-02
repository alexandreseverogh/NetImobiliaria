require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const poolConfig = {
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '15432'),
    ssl: false
};

const pool = new Pool(poolConfig);

const BROKER_UUID = 'b537ea32-2011-4511-812f-7a62edc7d701';
const IMOVEL_ID = 66;

async function debugRouting() {
    try {
        console.log(`DEBUG: Inspecting Imovel ID: ${IMOVEL_ID}`);

        const prospects = await pool.query(`
            SELECT ip.id, ip.created_at, i.cidade_fk, i.estado_fk 
            FROM imovel_prospects ip
            JOIN imoveis i ON ip.id_imovel = i.id
            WHERE ip.id_imovel = $1 
            ORDER BY ip.created_at DESC
            LIMIT 1
        `, [IMOVEL_ID]);

        if (prospects.rows.length === 0) { console.log("NO_PROSPECTS"); return; }
        const p = prospects.rows[0];
        console.log("PROSPECT:", JSON.stringify(p));

        const assigns = await pool.query(`
            SELECT id, corretor_fk, status, expira_em, motivo 
            FROM imovel_prospect_atribuicoes 
            WHERE prospect_id = $1 
            ORDER BY created_at ASC
        `, [p.id]);
        console.log("ASSIGNMENTS:", JSON.stringify(assigns.rows, null, 2));

        const potentialBrokers = await pool.query(`
                SELECT u.id, u.nome
                FROM users u
                JOIN corretor_areas_atuacao caa ON caa.corretor_fk = u.id
                JOIN user_role_assignments ura ON u.id = ura.user_id
                JOIN user_roles ur ON ura.role_id = ur.id
                WHERE u.ativo = true
                  AND ur.name = 'Corretor'
                  AND caa.estado_fk = $1 
                  AND caa.cidade_fk = $2
                  AND (u.tipo_corretor = 'Externo' OR u.tipo_corretor IS NULL)
                  AND u.id NOT IN (
                      SELECT corretor_fk FROM imovel_prospect_atribuicoes WHERE prospect_id = $3
                  )
            `, [p.estado_fk, p.cidade_fk, p.id]);

        console.log("NEXT_BROKERS_COUNT:", potentialBrokers.rows.length);
        console.log("NEXT_BROKERS:", JSON.stringify(potentialBrokers.rows, null, 2));
    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        pool.end();
    }
}

debugRouting();


const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
});

async function check() {
    try {
        const res = await pool.query(`
      SELECT ip.id 
      FROM imovel_prospects ip 
      JOIN imoveis i ON ip.id_imovel = i.id 
      WHERE i.estado_fk = 'PE' AND i.cidade_fk = 'Recife'
      LIMIT 1
    `);

        if (res.rows.length > 0) {
            console.log('PROSPECT_ID:', res.rows[0].id);
        } else {
            console.log('NO_PROSPECT_FOUND');

            const prop = await pool.query(`
        SELECT id, codigo 
        FROM imoveis 
        WHERE estado_fk = 'PE' AND cidade_fk = 'Recife' 
        LIMIT 1
      `);

            if (prop.rows.length > 0) {
                console.log('PROPERTY_FOR_SEEDING_ID:', prop.rows[0].id);
            } else {
                console.log('NO_PROPERTY_FOUND');
            }
        }

    } catch (e) { console.error(e); }
    pool.end();
}
check();

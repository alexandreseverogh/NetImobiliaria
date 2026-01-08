
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
        // 1. Check existing prospects in Recife/PE
        const res = await pool.query(`
      SELECT ip.id, i.titulo, i.cidade_fk 
      FROM imovel_prospects ip 
      JOIN imoveis i ON ip.id_imovel = i.id 
      WHERE i.estado_fk = 'PE' AND i.cidade_fk = 'Recife'
      LIMIT 5
    `);

        if (res.rows.length > 0) {
            console.log('--- Found Prospects ---');
            console.table(res.rows);
        } else {
            console.log('--- No Prospects Found in Recife ---');

            // 2. If no prospects, find a valid Property in Recife to seed one
            const prop = await pool.query(`
        SELECT id, titulo, codigo 
        FROM imoveis 
        WHERE estado_fk = 'PE' AND cidade_fk = 'Recife' 
        LIMIT 1
      `);

            if (prop.rows.length > 0) {
                console.log('--- Available Property for Seeding ---');
                console.log('ID:', prop.rows[0].id);
                console.log('CODE:', prop.rows[0].codigo);
            } else {
                console.log('--- No Property Found in Recife either! ---');
            }
        }

    } catch (e) { console.error(e); }
    pool.end();
}
check();

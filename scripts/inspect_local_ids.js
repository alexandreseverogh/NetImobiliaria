
const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const localConfig = {
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'Roberto@2007',
    port: 5432,
};

async function inspectIDs() {
    const pool = new Pool(localConfig);
    try {
        console.log('--- Identificando Sidebar Items por ID (Local) ---');
        // IDs achados na tabela sidebar_item_roles
        const ids = [5, 6, 14, 16, 17];

        const res = await pool.query(`SELECT * FROM sidebar_menu_items WHERE id = ANY($1::int[])`, [ids]);
        console.table(res.rows);

        // Also check if there is ANY item with url /admin/parametros
        const urlRes = await pool.query(`SELECT * FROM sidebar_menu_items WHERE url ILIKE '%parametros%'`);
        console.log('\n--- Items com URL %parametros% ---');
        console.table(urlRes.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

inspectIDs();

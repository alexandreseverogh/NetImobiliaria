
const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const localConfig = {
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'Roberto@2007',
    port: 5432,
};

async function dumpIDs() {
    const pool = new Pool(localConfig);
    try {
        const ids = [5, 6, 14, 16, 17];
        const res = await pool.query(`SELECT * FROM sidebar_menu_items WHERE id = ANY($1::int[])`, [ids]);

        const output = JSON.stringify(res.rows, null, 2);
        fs.writeFileSync('sidebar_ids_local.txt', output);
        console.log('Dados salvos em sidebar_ids_local.txt');

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

dumpIDs();

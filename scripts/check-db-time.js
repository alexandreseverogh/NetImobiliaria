
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function checkDbTime() {
    try {
        const res = await pool.query("SHOW timezone;");
        const resNow = await pool.query("SELECT NOW();");

        console.log('--- DB CONFIG CHECK ---');
        console.log('DB Timezone:', res.rows[0].TimeZone);
        console.log('DB NOW():', resNow.rows[0].now);
        console.log('JS Date.now():', new Date().toISOString());
        await pool.end();
    } catch (err) {
        console.error('Erro:', err);
        await pool.end();
    }
}

checkDbTime();

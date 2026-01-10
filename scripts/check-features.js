require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function check() {
    try {
        const res = await pool.query("SELECT slug FROM system_features WHERE slug LIKE 'status%' ORDER BY slug");
        console.log('System Features (status%):');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

check();

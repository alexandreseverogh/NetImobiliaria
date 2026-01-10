const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const client = new Client({
    user: process.env.POSTGRES_USER || 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    database: 'net_imobiliaria',
    password: process.env.POSTGRES_PASSWORD || 'Roberto@2007',
    port: parseInt(process.env.POSTGRES_PORT) || 5432,
});

async function main() {
    const email = 'josedamasio@gmail.com';

    try {
        await client.connect();

        console.log(`\n--- Looking up User: ${email} ---`);
        const res = await client.query("SELECT id, username, email FROM users WHERE email = $1", [email]);
        console.log(JSON.stringify(res.rows, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

main();

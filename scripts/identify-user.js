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
    const userId = 'c57ab897-c068-46a4-9b12-bb9f2d938fe7';

    try {
        await client.connect();

        console.log(`\n--- Looking up User: ${userId} ---`);
        const res = await client.query("SELECT id, username, email, nome FROM users WHERE id = $1", [userId]);
        console.table(res.rows);

        console.log(`\n--- Checking Role Assignments for ${userId} ---`);
        const roleRes = await client.query("SELECT * FROM user_role_assignments WHERE user_id = $1", [userId]);
        console.table(roleRes.rows);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

main();

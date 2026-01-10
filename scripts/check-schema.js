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
    try {
        await client.connect();
        console.log('Connected to database');

        const query = `
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name IN ('user_roles', 'user_role_assignments', 'system_features', 'role_permissions', 'permissions')
            ORDER BY table_name, ordinal_position;
        `;

        const res = await client.query(query);
        // console.table(res.rows);
        const fs = require('fs');
        fs.writeFileSync('schema_output.txt', JSON.stringify(res.rows, null, 2));
        console.log('Schema written to schema_output.txt');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

main();

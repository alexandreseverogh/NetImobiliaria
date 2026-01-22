const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const client = new Client({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT) || 15432,
});

async function main() {
    try {
        await client.connect();
        console.log('Connected to database');

        const query = `
            SELECT id, nome, ativo, consulta_imovel_internauta 
            FROM status_imovel 
            WHERE id IN (1, 100);
        `;

        const res = await client.query(query);
        console.log(JSON.stringify(res.rows, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

main();

const { Client } = require('pg');

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'net_imobiliaria',
    password: 'postgres',
    port: 15432,
    ssl: false
});

console.log('Testing connection to localhost:15432...');

client.connect()
    .then(async () => {
        console.log('✅ Connected successfully!');
        const res = await client.query('SELECT version()');
        console.log('PG Version:', res.rows[0].version);

        const countRes = await client.query('SELECT count(*) FROM users');
        console.log('User count in Container DB:', countRes.rows[0].count);

        await client.end();
    })
    .catch(err => {
        console.error('❌ Connection failed:', err.message);
        console.error('Code:', err.code);
        process.exit(1);
    });

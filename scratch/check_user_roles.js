const { Client } = require('pg');

async function checkUserRoles() {
    const client = new Client({
        host: '127.0.0.1',
        port: 15432,
        user: 'postgres',
        password: 'postgres',
        database: 'net_imobiliaria'
    });
    try {
        await client.connect();
        const res = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'user_roles'");
        console.log('Colunas em user_roles:', res.rows.map(r => r.column_name));
    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await client.end();
    }
}

checkUserRoles();

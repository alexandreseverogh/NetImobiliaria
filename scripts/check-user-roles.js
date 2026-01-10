const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    user: process.env.POSTGRES_USER || 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    database: 'net_imobiliaria',
    password: process.env.POSTGRES_PASSWORD || 'Roberto@2007',
    port: parseInt(process.env.POSTGRES_PORT) || 5432,
});

async function checkRoles() {
    try {
        await client.connect();

        const email = 'josedamasio@gmail.com';
        console.log('Checking roles for:', email);

        const res = await client.query(`
            SELECT u.email, r.name as role_name, r.level
            FROM users u 
            JOIN user_role_assignments ura ON u.id = ura.user_id 
            JOIN user_roles r ON ura.role_id = r.id 
            WHERE u.email = $1
        `, [email]);

        console.log(JSON.stringify(res.rows, null, 2));

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

checkRoles();

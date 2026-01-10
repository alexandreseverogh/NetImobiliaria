const { Client } = require('pg');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config(); // Load .env as well just in case

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

        // 1. Get User
        const email = 'josedamasio@gmail.com';
        const userRes = await client.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userRes.rows.length === 0) throw new Error('User not found');
        const user = userRes.rows[0];

        console.log('User found:', user.email, user.id);

        // 2. Generate Token (Replicating logic)
        // Use fallback from src/lib/config/auth.ts
        const secret = process.env.JWT_SECRET || 'sua-chave-secreta-super-segura-aqui';
        console.log('Using Secret:', secret.substring(0, 5) + '...');

        const payload = {
            userId: user.id,
            username: user.username,
            email: user.email,
            role_name: 'Corretor', // Force correct role
            role_level: 2,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600
        };

        const token = jwt.sign(payload, secret);
        console.log('Token generated.');

        // 3. Fetch
        console.log('Fetching /api/admin/proprietarios/mine...');
        const res = await fetch('http://localhost:3000/api/admin/proprietarios/mine?limit=1&page=1', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('Status:', res.status);
        const text = await res.text();
        console.log('Response:', text);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

main();

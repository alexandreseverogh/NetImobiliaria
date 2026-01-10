const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    user: process.env.POSTGRES_USER || 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    database: 'net_imobiliaria',
    password: process.env.POSTGRES_PASSWORD || 'Roberto@2007',
    port: parseInt(process.env.POSTGRES_PORT) || 5432,
});

async function fixPermission() {
    try {
        await client.connect();
        console.log('Connected to database');

        const route = '/api/admin/proprietarios/mine';

        // Check if exists
        const check = await client.query('SELECT id FROM route_permissions_config WHERE route_pattern = $1', [route]);

        // Get valid user for created_by
        const userRes = await client.query('SELECT id FROM users LIMIT 1');
        const userId = userRes.rows[0].id;

        if (check.rows.length > 0) {
            console.log('Route config exists. Updating...');
            await client.query(`
                UPDATE route_permissions_config 
                SET requires_auth = false, feature_id = NULL
                WHERE route_pattern = $1
            `, [route]);
        } else {
            console.log('Route config does NOT exist. Inserting...');
            await client.query(`
                INSERT INTO route_permissions_config (route_pattern, method, requires_auth, default_action, created_by)
                VALUES ($1, 'GET', false, 'READ', $2)
            `, [route, userId]);
        }

        console.log('Successfully exempted /api/admin/proprietarios/mine from middleware checks.');

    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}

fixPermission();

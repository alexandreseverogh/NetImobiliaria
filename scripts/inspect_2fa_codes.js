
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
    const envPath = path.join(__dirname, '../.env.local');
    const envVars = {};
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const [key, ...valueParts] = trimmedLine.split('=');
                if (key && valueParts.length > 0) {
                    envVars[key] = valueParts.join('=').trim();
                }
            }
        }
    }
    return envVars;
}

async function run() {
    const envVars = loadEnvFile();
    // FORCE PORT 15432 or from env
    const port = parseInt(envVars.DB_PORT || envVars.POSTGRES_PORT || '15432');

    const config = {
        host: envVars.DB_HOST || envVars.POSTGRES_HOST || 'localhost',
        port: port,
        database: envVars.DB_NAME || envVars.POSTGRES_DB || 'net_imobiliaria',
        user: envVars.DB_USER || envVars.POSTGRES_USER || 'postgres',
        password: envVars.DB_PASSWORD || envVars.POSTGRES_PASSWORD || 'Roberto@2007'
    };

    console.log('Connecting to:', { ...config, password: '***' });
    const client = new Client(config);
    await client.connect();

    console.log('\n--- DB Time Check ---');
    const timeRes = await client.query("SELECT NOW() as db_now, NOW()::text as db_now_text, current_setting('TIMEZONE') as timezone");
    console.log('DB Now (Date obj):', timeRes.rows[0].db_now);
    console.log('DB Now (Text):', timeRes.rows[0].db_now_text);
    console.log('DB Timezone:', timeRes.rows[0].timezone);
    console.log('JS Local Time:', new Date().toString());

    console.log('\n--- Recent 2FA Codes ---');
    const codesRes = await client.query(`
    SELECT id, user_id, code, method, used, expires_at, created_at, ip_address 
    FROM user_2fa_codes 
    ORDER BY created_at DESC 
    LIMIT 5
  `);

    if (codesRes.rows.length === 0) {
        console.log('No codes found.');
    } else {
        // console.table(codesRes.rows);
        codesRes.rows.forEach(r => {
            const isExpired = new Date(r.expires_at) < new Date(timeRes.rows[0].db_now);
            console.log(`Code: ${r.code}, Used: ${r.used}, Expires: ${r.expires_at} (Expired? ${isExpired}), IP: ${r.ip_address}`);
        });
    }

    console.log('\n--- Schema Check: user_2fa_codes ---');
    const schemaRes = await client.query(`
    SELECT column_name, data_type, udt_name 
    FROM information_schema.columns 
    WHERE table_name = 'user_2fa_codes'
  `);
    schemaRes.rows.forEach(r => console.log(`${r.column_name}: ${r.data_type} (${r.udt_name})`));

    await client.end();
}

run();

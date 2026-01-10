
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
    const config = {
        host: envVars.DB_HOST || envVars.POSTGRES_HOST || 'localhost',
        port: parseInt(envVars.DB_PORT || envVars.POSTGRES_PORT || '15432'),
        database: envVars.DB_NAME || envVars.POSTGRES_DB || 'net_imobiliaria',
        user: envVars.DB_USER || envVars.POSTGRES_USER || 'postgres',
        password: envVars.DB_PASSWORD || envVars.POSTGRES_PASSWORD || 'Roberto@2007'
    };
    console.log('Connecting to:', config);

    const client = new Client(config);
    await client.connect();

    const newPass = 'eheedrjajczxuznm';
    const newHost = 'smtp.gmail.com';
    const newUser = 'smtp.netimobiliaria@gmail.com';

    console.log(`Updating email_settings for user ${newUser}...`);

    const res = await client.query(`
    UPDATE email_settings 
    SET smtp_host = $1, smtp_password = $2, smtp_username = $3, from_email = $3, updated_at = NOW()
    WHERE is_active = true
    RETURNING id, smtp_host, smtp_username
  `, [newHost, newPass, newUser]);

    if (res.rowCount > 0) {
        console.log('✅ Update SUCCESS:', res.rows[0]);
    } else {
        console.log('❌ Update FAILED: No active settings found.');
    }

    await client.end();
}

run();

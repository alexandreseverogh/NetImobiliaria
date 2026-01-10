
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
        host: envVars.POSTGRES_HOST || 'localhost',
        port: parseInt(envVars.POSTGRES_PORT) || 5432,
        database: envVars.POSTGRES_DB || 'net_imobiliaria',
        user: envVars.POSTGRES_USER || 'postgres',
        password: envVars.POSTGRES_PASSWORD || 'Roberto@2007'
    };

    const client = new Client(config);
    await client.connect();

    console.log('--- Checking 2FA Templates Status ---');
    const res = await client.query("SELECT id, name, is_active FROM email_templates WHERE name LIKE '%2fa%'");
    res.rows.forEach(r => console.log(`ID: ${r.id}, Name: ${r.name}, Active: ${r.is_active}`));

    console.log('--- Checking Recent Email Logs (Last 3) ---');
    const logs = await client.query('SELECT template_name, success, error_message, sent_at FROM email_logs ORDER BY sent_at DESC LIMIT 3');
    logs.rows.forEach(r => console.log(`[${r.sent_at}] Tpl: ${r.template_name} | Success: ${r.success} | Err: ${r.error_message}`));

    await client.end();
}

run();

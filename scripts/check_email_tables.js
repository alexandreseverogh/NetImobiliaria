
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

    console.log('--- Checking email_settings ---');
    try {
        const res = await client.query('SELECT * FROM email_settings WHERE is_active = true');
        console.log(`Active settings found: ${res.rows.length}`);
        if (res.rows.length > 0) {
            const s = res.rows[0];
            console.log(`Host: ${s.smtp_host}, User: ${s.smtp_username}, From: ${s.from_email}`);
        }
    } catch (err) {
        console.log('Error checking email_settings:', err.message);
    }

    console.log('--- Checking email_templates ---');
    try {
        const res = await client.query('SELECT id, name, subject FROM email_templates');
        console.log(`Templates found: ${res.rows.length}`);
        res.rows.forEach(r => console.log(`ID: ${r.id}, Name: ${r.name}, Subject: ${r.subject}`));
    } catch (err) {
        console.log('Error checking email_templates:', err.message);
    }

    console.log('--- Checking email_logs (last 5 error) ---');
    try {
        const res = await client.query('SELECT * FROM email_logs WHERE success = false ORDER BY sent_at DESC LIMIT 5');
        console.log(`Error logs found: ${res.rows.length}`);
        res.rows.forEach(r => console.log(`Date: ${r.sent_at}, Template: ${r.template_name}, Error: ${r.error_message}`));
    } catch (err) {
        console.log('Error checking email_logs:', err.message);
    }

    await client.end();
}

run();

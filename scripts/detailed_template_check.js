
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
    const envPath = path.join(__dirname, '../.env.local');
    const envVars = {};
    if (fs.existsSync(envPath)) {
        console.log(`Loading .env.local from: ${envPath}`);
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
    } else {
        console.log(`❌ .env.local NOT FOUND at: ${envPath}`);
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

    console.log('--- Connection Details ---');
    console.log(`Host: ${config.host}`);
    console.log(`Port: ${config.port}`);
    console.log(`Database: ${config.database}`);
    console.log(`User: ${config.user}`);
    console.log('--------------------------');

    const client = new Client(config);
    try {
        await client.connect();
        console.log('✅ Connected to Database.');

        console.log('--- Querying email_templates ---');
        const res = await client.query('SELECT id, name, subject, is_active FROM email_templates');
        console.log(`Total rows in email_templates: ${res.rows.length}`);

        if (res.rows.length === 0) {
            console.log('No templates found.');
        } else {
            res.rows.forEach(r => {
                console.log(`[ID: ${r.id}] Name: "${r.name}" | Active: ${r.is_active} | Subject: "${r.subject}"`);
            });
        }

    } catch (err) {
        console.error('❌ Connection Failed:', err.message);
    } finally {
        await client.end();
    }
}

run();

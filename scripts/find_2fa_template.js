
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

    console.log('SEARCHING FOR 2FA TEMPLATES:');
    const res = await client.query("SELECT id, name FROM email_templates WHERE name LIKE '%2fa%' OR name LIKE '%verif%'");

    if (res.rows.length === 0) {
        console.log('NO 2FA TEMPLATES FOUND.');
    } else {
        res.rows.forEach(r => console.log(`FOUND: ID=${r.id}, NAME="${r.name}"`));
    }

    await client.end();
}

run();

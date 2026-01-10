
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
    const port = parseInt(envVars.DB_PORT || envVars.POSTGRES_PORT || '15432');
    const config = {
        host: envVars.DB_HOST || envVars.POSTGRES_HOST || 'localhost',
        port: port,
        database: envVars.DB_NAME || envVars.POSTGRES_DB || 'net_imobiliaria',
        user: envVars.DB_USER || envVars.POSTGRES_USER || 'postgres',
        password: envVars.DB_PASSWORD || envVars.POSTGRES_PASSWORD || 'Roberto@2007'
    };

    const client = new Client(config);
    await client.connect();
    console.log('Connected to DB');

    const res = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'users'
  `);

    const hasAvatar = res.rows.find(r => r.column_name === 'avatar_url');
    console.log('Has avatar_url?', !!hasAvatar);

    await client.end();
}

run();


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

    const tables = ['user_2fa_codes', 'user_2fa_config', 'audit_2fa_logs', 'login_logs'];

    for (const table of tables) {
        console.log(`Checking table: ${table}`);
        const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = $1
    `, [table]);

        if (res.rows.length === 0) {
            console.log(`❌ Table ${table} NOT FOUND!`);
        } else {
            console.log(`✅ Table ${table} found with columns:`);
            res.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));
        }
        console.log('---');
    }

    await client.end();
}

run();

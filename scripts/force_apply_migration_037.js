
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Função para ler variáveis do arquivo .env.local
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
    const logFile = path.join(__dirname, 'migration_output.txt');
    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
    };

    fs.writeFileSync(logFile, 'Starting migration 037 force apply...\n');

    try {
        const envVars = loadEnvFile();
        const config = {
            host: envVars.POSTGRES_HOST || 'localhost',
            port: parseInt(envVars.POSTGRES_PORT) || 5432,
            database: envVars.POSTGRES_DB || 'net_imobiliaria',
            user: envVars.POSTGRES_USER || 'postgres',
            password: envVars.POSTGRES_PASSWORD || 'Roberto@2007'
        };

        log('Config host: ' + config.host);
        log('Config port: ' + config.port);

        const client = new Client(config);
        await client.connect();
        log('Connected.');

        const sqlPath = path.join(__dirname, '..', 'database', 'migrations', '037_create_imovel_prospect_atribuicoes.sql');
        log('Reading SQL from: ' + sqlPath);
        const sql = fs.readFileSync(sqlPath, 'utf8');

        log('Executing SQL...');
        await client.query(sql);
        log('Migration 037 applied successfully!');

        await client.end();
    } catch (err) {
        log('Error: ' + err.message);
        log('Stack: ' + err.stack);
    }
}

run();

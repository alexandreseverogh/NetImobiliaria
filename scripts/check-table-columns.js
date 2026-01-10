
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

async function check() {
    const logFile = path.join(__dirname, 'debug_output.txt');
    const log = (msg) => {
        console.log(msg);
        fs.appendFileSync(logFile, msg + '\n');
    };

    fs.writeFileSync(logFile, 'Listing columns of imovel_prospect_atribuicoes...\n');

    try {
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

        const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'imovel_prospect_atribuicoes'
      ORDER BY ordinal_position
    `);

        if (res.rows.length === 0) {
            log('Table imovel_prospect_atribuicoes NOT FOUND!');
        } else {
            log('Columns: ' + JSON.stringify(res.rows, null, 2));
        }

        await client.end();
    } catch (err) {
        log('Error: ' + err.message);
    }
}

check();

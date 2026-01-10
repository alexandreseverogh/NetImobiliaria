
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
    console.log('Connected to DB on port:', port);

    try {
        // Check created_by
        const resCreated = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'corretor_areas_atuacao' AND column_name = 'created_by'
    `);

        if (resCreated.rows.length === 0) {
            console.log('Adding missing column: created_by');
            await client.query(`ALTER TABLE corretor_areas_atuacao ADD COLUMN created_by UUID REFERENCES users(id)`);
            console.log('✅ created_by added.');
        } else {
            console.log('ℹ️ created_by already exists.');
        }

        // Check updated_by
        const resUpdated = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'corretor_areas_atuacao' AND column_name = 'updated_by'
    `);

        if (resUpdated.rows.length === 0) {
            console.log('Adding missing column: updated_by');
            await client.query(`ALTER TABLE corretor_areas_atuacao ADD COLUMN updated_by UUID REFERENCES users(id)`);
            console.log('✅ updated_by added.');
        } else {
            console.log('ℹ️ updated_by already exists.');
        }

    } catch (err) {
        console.error('❌ Error fixing schema:', err);
    } finally {
        await client.end();
    }
}

run();

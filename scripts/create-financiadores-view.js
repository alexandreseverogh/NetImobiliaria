const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envConfig[key.trim()] = value.trim();
    }
});

const pool = new Pool({
    user: envConfig.DB_USER,
    host: envConfig.DB_HOST,
    database: envConfig.DB_NAME,
    password: envConfig.DB_PASSWORD,
    port: parseInt(envConfig.DB_PORT || '5432'),
});

async function createView() {
    try {
        console.log('\n🔧 Criando view financiamento_patrocinadores...\n');

        // Dropar view se existir
        await pool.query('DROP VIEW IF EXISTS financiamento_patrocinadores');

        // Criar view
        await pool.query('CREATE VIEW financiamento_patrocinadores AS SELECT * FROM financiadores');

        console.log('✅ View criada com sucesso');

        // Verificar
        const test = await pool.query('SELECT COUNT(*) FROM financiamento_patrocinadores');
        console.log(`📊 Total de registros na view: ${test.rows[0].count}`);

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

createView();

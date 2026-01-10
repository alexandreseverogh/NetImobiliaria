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

async function updateLead() {
    try {
        // Atualizar diretamente para 10 minutos atrás
        const res = await pool.query(`
      UPDATE imovel_prospect_atribuicoes
      SET expira_em = NOW() - INTERVAL '10 minutes'
      WHERE id = 3 AND prospect_id = 12
      RETURNING id, prospect_id, status, expira_em
    `);

        console.log('✅ Lead atualizado:');
        console.log(JSON.stringify(res.rows[0], null, 2));

    } catch (err) {
        console.error('Erro:', err.message);
    } finally {
        await pool.end();
    }
}

updateLead();

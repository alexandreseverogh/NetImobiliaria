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

async function checkLead() {
    try {
        // Verificar o lead específico
        const res = await pool.query(`
      SELECT 
        pa.id,
        pa.prospect_id,
        pa.status,
        pa.expira_em,
        pa.expira_em < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo') as expirado,
        EXTRACT(EPOCH FROM ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo') - pa.expira_em)) / 60 as minutos_expirado
      FROM imovel_prospect_atribuicoes pa
      WHERE pa.id = 3 AND pa.prospect_id = 12
    `);

        console.log('\nResultado:');
        console.log(JSON.stringify(res.rows[0], null, 2));

    } catch (err) {
        console.error('Erro:', err.message);
    } finally {
        await pool.end();
    }
}

checkLead();

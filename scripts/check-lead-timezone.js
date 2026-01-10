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

async function checkExpiration() {
    try {
        const res = await pool.query(`
      SELECT 
        id,
        prospect_id,
        status,
        expira_em,
        expira_em AT TIME ZONE 'America/Sao_Paulo' as expira_em_brt,
        NOW() as now_utc,
        CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo' as now_brt,
        expira_em < NOW() as expirado_utc,
        expira_em < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo') as expirado_brt
      FROM imovel_prospect_atribuicoes
      WHERE id = 4
    `);

        console.log('\n📊 Análise de Timezone:');
        console.log(JSON.stringify(res.rows[0], null, 2));

    } catch (err) {
        console.error('Erro:', err.message);
    } finally {
        await pool.end();
    }
}

checkExpiration();

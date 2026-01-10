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

async function checkAtribuicao6() {
    try {
        const res = await pool.query(`
      SELECT 
        id, 
        prospect_id, 
        status, 
        expira_em,
        expira_em < NOW() as expirado_utc,
        EXTRACT(EPOCH FROM (NOW() - expira_em)) / 60 as minutos_expirado
      FROM imovel_prospect_atribuicoes 
      WHERE id = 6
    `);

        console.log('\n📋 Atribuição ID 6:');
        console.log(JSON.stringify(res.rows[0], null, 2));

        if (res.rows[0].expirado_utc) {
            console.log('\n✅ Atribuição ESTÁ EXPIRADA!');
            console.log(`   Expirou há ${parseFloat(res.rows[0].minutos_expirado).toFixed(2)} minutos`);
            console.log('\n⚠️  MAS o status ainda é "atribuido" - o cron não atualizou!');
        } else {
            console.log('\n❌ Atribuição NÃO está expirada ainda');
        }

    } catch (err) {
        console.error('Erro:', err.message);
    } finally {
        await pool.end();
    }
}

checkAtribuicao6();

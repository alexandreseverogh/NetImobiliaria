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

async function forceExpiration() {
    try {
        console.log('\n🔧 Forçando expiração do Lead ID 3...\n');

        // 1. Verificar estado atual
        const beforeRes = await pool.query(`
      SELECT id, prospect_id, status, expira_em, corretor_fk
      FROM imovel_prospect_atribuicoes
      WHERE id = 3 AND prospect_id = 12
    `);

        console.log('📋 Estado ANTES:');
        console.log(JSON.stringify(beforeRes.rows[0], null, 2));

        // 2. Forçar expiração (5 minutos atrás)
        await pool.query(`
      UPDATE imovel_prospect_atribuicoes
      SET expira_em = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo') - INTERVAL '5 minutes'
      WHERE id = 3 AND prospect_id = 12
    `);

        console.log('\n✅ Expiração forçada para 5 minutos atrás!');

        // 3. Verificar estado após update
        const afterRes = await pool.query(`
      SELECT 
        id, 
        prospect_id, 
        status, 
        expira_em,
        corretor_fk,
        expira_em < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo') as expirado
      FROM imovel_prospect_atribuicoes
      WHERE id = 3 AND prospect_id = 12
    `);

        console.log('\n📋 Estado DEPOIS:');
        console.log(JSON.stringify(afterRes.rows[0], null, 2));

        console.log('\n✅ Agora você pode chamar o endpoint /api/cron/transbordo para processar!');

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

forceExpiration();

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

async function findExpiredLeads() {
    try {
        console.log('\n🔍 Buscando TODAS as atribuições expiradas...\n');

        const res = await pool.query(`
      SELECT 
        pa.id,
        pa.prospect_id,
        pa.status,
        pa.corretor_fk,
        u.nome as corretor_nome,
        pa.expira_em,
        pa.expira_em < NOW() as expirado_utc,
        EXTRACT(EPOCH FROM (NOW() - pa.expira_em)) / 60 as minutos_expirado
      FROM imovel_prospect_atribuicoes pa
      JOIN users u ON u.id = pa.corretor_fk
      WHERE pa.expira_em < NOW()
        AND pa.status = 'atribuido'
      ORDER BY pa.expira_em
      LIMIT 10
    `);

        console.log(`📋 Atribuições expiradas com status 'atribuido': ${res.rows.length}\n`);

        if (res.rows.length > 0) {
            console.table(res.rows.map(r => ({
                id: r.id,
                prospect_id: r.prospect_id,
                corretor: r.corretor_nome.substring(0, 20),
                status: r.status,
                expira_em: r.expira_em.toISOString().substring(0, 19),
                minutos_exp: parseFloat(r.minutos_expirado).toFixed(2)
            })));

            console.log(`\n⚠️  ${res.rows.length} lead(s) expirado(s) aguardando processamento!`);
            console.log(`\nExecute o cron para processar:`);
            console.log(`curl http://localhost:3000/api/cron/transbordo`);
        } else {
            console.log('✅ Nenhuma atribuição expirada encontrada.');
        }

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

findExpiredLeads();

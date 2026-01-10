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

async function checkExpiredLeads() {
    try {
        console.log('\n🔍 Verificando leads expirados...\n');

        // 1. Verificar timezone atual do servidor
        const tzRes = await pool.query("SELECT NOW() as utc_now, CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo' as brazil_now");
        console.log('⏰ Timezone do Servidor:');
        console.table(tzRes.rows);

        // 2. Buscar leads com status 'atribuido' e verificar expiração
        const leadsRes = await pool.query(`
      SELECT 
        pa.id,
        pa.prospect_id,
        pa.corretor_fk,
        u.nome as corretor_nome,
        pa.status,
        pa.expira_em,
        pa.expira_em < NOW() as expirado_utc,
        pa.expira_em < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo') as expirado_brazil,
        EXTRACT(EPOCH FROM (pa.expira_em - NOW())) / 3600 as horas_restantes_utc,
        EXTRACT(EPOCH FROM (pa.expira_em - (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'))) / 3600 as horas_restantes_brazil
      FROM imovel_prospect_atribuicoes pa
      JOIN users u ON u.id = pa.corretor_fk
      WHERE pa.status = 'atribuido'
      ORDER BY pa.expira_em ASC
    `);

        console.log(`\n📋 Leads com status 'atribuido': ${leadsRes.rows.length}\n`);

        if (leadsRes.rows.length > 0) {
            console.table(leadsRes.rows.map(r => ({
                id: r.id,
                prospect_id: r.prospect_id,
                corretor: r.corretor_nome,
                expira_em: r.expira_em,
                expirado_utc: r.expirado_utc,
                expirado_brazil: r.expirado_brazil,
                horas_restantes_brazil: parseFloat(r.horas_restantes_brazil).toFixed(2)
            })));
        }

        // 3. Buscar histórico de atribuições expiradas
        const historyRes = await pool.query(`
      SELECT 
        pa.id,
        pa.prospect_id,
        pa.corretor_fk,
        u.nome as corretor_nome,
        pa.status,
        pa.expira_em,
        pa.created_at
      FROM imovel_prospect_atribuicoes pa
      JOIN users u ON u.id = pa.corretor_fk
      WHERE pa.status = 'expirado'
      ORDER BY pa.created_at DESC
      LIMIT 10
    `);

        console.log(`\n📜 Últimas 10 atribuições expiradas:\n`);
        if (historyRes.rows.length > 0) {
            console.table(historyRes.rows);
        } else {
            console.log('Nenhuma atribuição expirada encontrada.');
        }

    } catch (err) {
        console.error('❌ Erro:', err);
    } finally {
        await pool.end();
    }
}

checkExpiredLeads();

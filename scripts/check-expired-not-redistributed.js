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
        console.log('\n🔍 Verificando leads expirados que não foram redistribuídos...\n');

        // 1. Buscar leads com status 'atribuido' e expirados
        const expiredRes = await pool.query(`
      SELECT 
        pa.id,
        pa.prospect_id,
        pa.corretor_fk,
        u.nome as corretor_nome,
        u.tipo_corretor,
        u.is_plantonista,
        pa.status,
        pa.expira_em,
        pa.expira_em < NOW() as expirado,
        EXTRACT(EPOCH FROM (NOW() - pa.expira_em)) / 60 as minutos_expirado,
        pa.created_at
      FROM imovel_prospect_atribuicoes pa
      JOIN users u ON u.id = pa.corretor_fk
      WHERE pa.status = 'atribuido'
      ORDER BY pa.expira_em
    `);

        console.log(`📋 Leads com status 'atribuido': ${expiredRes.rows.length}\n`);

        if (expiredRes.rows.length > 0) {
            console.table(expiredRes.rows.map(r => ({
                id: r.id,
                prospect_id: r.prospect_id,
                corretor: r.corretor_nome,
                tipo: r.tipo_corretor,
                plantonista: r.is_plantonista,
                status: r.status,
                expira_em: r.expira_em,
                expirado: r.expirado,
                minutos_exp: parseFloat(r.minutos_expirado).toFixed(2)
            })));

            // Verificar quantos estão realmente expirados
            const reallyExpired = expiredRes.rows.filter(r => r.expirado);
            console.log(`\n⚠️  ${reallyExpired.length} lead(s) EXPIRADO(S) aguardando redistribuição!`);
        } else {
            console.log('✅ Nenhum lead com status "atribuido" encontrado.');
        }

        // 2. Verificar histórico de todos os prospects
        const historyRes = await pool.query(`
      SELECT 
        pa.prospect_id,
        COUNT(*) as total_atribuicoes,
        COUNT(CASE WHEN pa.status = 'expirado' THEN 1 END) as expirados,
        COUNT(CASE WHEN pa.status = 'atribuido' THEN 1 END) as atribuidos,
        COUNT(CASE WHEN pa.status = 'aceito' THEN 1 END) as aceitos
      FROM imovel_prospect_atribuicoes pa
      GROUP BY pa.prospect_id
      ORDER BY pa.prospect_id
    `);

        console.log(`\n📊 Resumo por Prospect:\n`);
        console.table(historyRes.rows);

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

checkExpiredLeads();

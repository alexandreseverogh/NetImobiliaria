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

async function investigateProspect19() {
    try {
        console.log('\n🔍 Investigando Prospect 19...\n');

        const res = await pool.query(`
      SELECT 
        pa.id,
        pa.status,
        pa.corretor_fk,
        u.nome as corretor_nome,
        u.tipo_corretor,
        pa.created_at,
        pa.expira_em,
        pa.expira_em < NOW() as expirado_utc,
        EXTRACT(EPOCH FROM (NOW() - pa.expira_em)) / 60 as minutos_expirado
      FROM imovel_prospect_atribuicoes pa
      JOIN users u ON u.id = pa.corretor_fk
      WHERE pa.prospect_id = 19
      ORDER BY pa.created_at
    `);

        console.log(`📋 Atribuições do Prospect 19: ${res.rows.length}\n`);

        if (res.rows.length > 0) {
            console.table(res.rows.map(r => ({
                id: r.id,
                corretor: r.corretor_nome.substring(0, 20),
                tipo: r.tipo_corretor,
                status: r.status,
                expirado: r.expirado_utc,
                minutos_exp: parseFloat(r.minutos_expirado).toFixed(2),
                expira_em: r.expira_em.toISOString().substring(0, 19)
            })));

            const expirados = res.rows.filter(r => r.status === 'expirado');
            const atribuidos = res.rows.filter(r => r.status === 'atribuido');
            const expiradosNaoMarcados = res.rows.filter(r => r.expirado_utc && r.status === 'atribuido');

            console.log(`\n📊 Resumo:`);
            console.log(`   - Total: ${res.rows.length}`);
            console.log(`   - Expirados (marcados): ${expirados.length}`);
            console.log(`   - Atribuídos (ativos): ${atribuidos.length}`);
            console.log(`   - ⚠️  Expirados mas NÃO marcados: ${expiradosNaoMarcados.length}`);

            if (expiradosNaoMarcados.length > 0) {
                console.log(`\n❌ PROBLEMA: ${expiradosNaoMarcados.length} atribuição(ões) expirada(s) mas com status 'atribuido'!`);
                console.log(`\n💡 Solução: Execute o cron para processar:`);
                console.log(`   curl http://localhost:3000/api/cron/transbordo`);
            }
        } else {
            console.log('❌ Nenhuma atribuição encontrada para Prospect 19');
        }

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

investigateProspect19();

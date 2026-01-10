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

async function investigateProspect17() {
    try {
        console.log('\n🔍 Investigando Prospect 17...\n');

        // 1. Verificar atribuições
        const atribuicoesRes = await pool.query(`
      SELECT 
        pa.id,
        pa.status,
        pa.corretor_fk,
        u.nome as corretor_nome,
        u.tipo_corretor,
        u.is_plantonista,
        pa.created_at,
        pa.expira_em,
        pa.expira_em < NOW() as expirado
      FROM imovel_prospect_atribuicoes pa
      JOIN users u ON u.id = pa.corretor_fk
      WHERE pa.prospect_id = 17
      ORDER BY pa.created_at
    `);

        console.log(`📋 Atribuições do Prospect 17: ${atribuicoesRes.rows.length}\n`);

        if (atribuicoesRes.rows.length > 0) {
            console.table(atribuicoesRes.rows.map(r => ({
                id: r.id,
                corretor: r.corretor_nome.substring(0, 20),
                tipo: r.tipo_corretor,
                plantonista: r.is_plantonista,
                status: r.status,
                expirado: r.expirado,
                created_at: r.created_at.toISOString().substring(0, 19)
            })));

            const expirados = atribuicoesRes.rows.filter(r => r.status === 'expirado');
            const atribuidos = atribuicoesRes.rows.filter(r => r.status === 'atribuido');

            console.log(`\n📊 Resumo:`);
            console.log(`   - Total: ${atribuicoesRes.rows.length}`);
            console.log(`   - Expirados: ${expirados.length}`);
            console.log(`   - Atribuídos (ativos): ${atribuidos.length}`);

            if (expirados.length > 0 && atribuidos.length === 0) {
                console.log(`\n❌ PROBLEMA: Lead expirou mas não foi redistribuído!`);
            } else if (expirados.length > 0 && atribuidos.length > 0) {
                console.log(`\n✅ SUCESSO: Lead foi redistribuído!`);
                const novaAtribuicao = atribuidos[atribuidos.length - 1];
                console.log(`   Novo corretor: ${novaAtribuicao.corretor_nome} (${novaAtribuicao.tipo_corretor})`);
            }
        } else {
            console.log('❌ Nenhuma atribuição encontrada para Prospect 17');
        }

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

investigateProspect17();

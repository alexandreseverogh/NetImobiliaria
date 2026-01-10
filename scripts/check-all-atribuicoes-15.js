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

async function checkAllAtribuicoes() {
    try {
        console.log('\n🔍 Verificando TODAS as atribuições do Prospect 15...\n');

        const res = await pool.query(`
      SELECT 
        pa.id,
        pa.status,
        pa.corretor_fk,
        u.nome as corretor_nome,
        u.tipo_corretor,
        pa.created_at,
        pa.expira_em
      FROM imovel_prospect_atribuicoes pa
      JOIN users u ON u.id = pa.corretor_fk
      WHERE pa.prospect_id = 15
      ORDER BY pa.created_at
    `);

        console.log(`📋 Total de atribuições: ${res.rows.length}\n`);
        console.table(res.rows.map(r => ({
            id: r.id,
            corretor: r.corretor_nome,
            tipo: r.tipo_corretor,
            status: r.status,
            created_at: r.created_at.toISOString().substring(0, 19)
        })));

        const expirados = res.rows.filter(r => r.status === 'expirado');
        const atribuidos = res.rows.filter(r => r.status === 'atribuido');

        console.log(`\n📊 Resumo:`);
        console.log(`   - Expirados: ${expirados.length}`);
        console.log(`   - Atribuídos (ativos): ${atribuidos.length}`);

        if (expirados.length > 0 && atribuidos.length === 0) {
            console.log(`\n❌ PROBLEMA CONFIRMADO: Lead expirou mas não foi redistribuído!`);
        } else if (atribuidos.length > 0) {
            console.log(`\n✅ Nova atribuição criada:`);
            atribuidos.forEach(a => {
                console.log(`   - ID: ${a.id}, Corretor: ${a.corretor_nome} (${a.tipo_corretor})`);
            });
        }

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

checkAllAtribuicoes();

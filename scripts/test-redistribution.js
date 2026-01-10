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

async function testRedistribution() {
    try {
        console.log('\n🔧 Testando redistribuição manual do Prospect 13...\n');

        // 1. Verificar estado atual
        const currentRes = await pool.query(`
      SELECT pa.id, pa.status, pa.corretor_fk, u.nome
      FROM imovel_prospect_atribuicoes pa
      JOIN users u ON u.id = pa.corretor_fk
      WHERE pa.prospect_id = 13
      ORDER BY pa.created_at DESC
      LIMIT 1
    `);

        console.log('📋 Estado atual:');
        console.table(currentRes.rows);

        // 2. Verificar se há corretores disponíveis
        const corretoresRes = await pool.query(`
      SELECT u.id, u.nome, u.tipo_corretor, u.is_plantonista
      FROM users u
      JOIN user_role_assignments ura ON ura.user_id = u.id
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ur.name = 'Corretor'
        AND u.ativo = true
        AND u.tipo_corretor = 'Externo'
      LIMIT 5
    `);

        console.log(`\n👥 Corretores EXTERNOS disponíveis: ${corretoresRes.rows.length}`);
        console.table(corretoresRes.rows);

        // 3. Simular chamada do routeProspectAndNotify
        console.log('\n🔄 Para redistribuir, execute:');
        console.log('curl http://localhost:3000/api/cron/transbordo');

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

testRedistribution();

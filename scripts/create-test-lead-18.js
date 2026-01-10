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

async function createTestLead18() {
    try {
        console.log('\n🧪 Criando lead de teste para Prospect 18...\n');

        // 1. Limpar atribuições existentes
        await pool.query('DELETE FROM imovel_prospect_atribuicoes WHERE prospect_id = 18');
        console.log('✅ Atribuições antigas deletadas');

        // 2. Buscar corretor externo
        const corretorRes = await pool.query(`
      SELECT u.id, u.nome
      FROM users u
      JOIN user_role_assignments ura ON ura.user_id = u.id
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ur.name = 'Corretor'
        AND u.ativo = true
        AND u.tipo_corretor = 'Externo'
      LIMIT 1
    `);

        const corretor = corretorRes.rows[0];
        console.log(`✅ Corretor selecionado: ${corretor.nome}`);

        // 3. Criar atribuição já expirada
        const expiraEm = new Date(Date.now() - 2 * 60 * 1000); // 2 minutos atrás

        await pool.query(`
      INSERT INTO imovel_prospect_atribuicoes (
        prospect_id,
        corretor_fk,
        status,
        motivo,
        expira_em
      ) VALUES (18, $1, 'atribuido', '{"type":"test"}', $2)
    `, [corretor.id, expiraEm]);

        console.log(`✅ Atribuição criada (JÁ EXPIRADA)`);
        console.log(`   Expira em: ${expiraEm.toISOString()}`);
        console.log(`\n📋 Agora execute o cron e monitore os logs do servidor:`);
        console.log(`   curl http://localhost:3000/api/cron/transbordo`);
        console.log(`\n📋 Depois verifique o resultado:`);
        console.log(`   node scripts/investigate-prospect-18.js`);

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

createTestLead18();

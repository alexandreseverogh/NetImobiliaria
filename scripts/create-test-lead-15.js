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

async function createTestLead() {
    try {
        console.log('\n🧪 Criando lead de teste para Prospect 15...\n');

        // 1. Verificar se prospect 15 existe
        const prospectRes = await pool.query('SELECT id, id_imovel FROM imovel_prospects WHERE id = 15');

        if (prospectRes.rows.length === 0) {
            console.log('❌ Prospect 15 não existe!');
            return;
        }

        console.log('✅ Prospect 15 existe');

        // 2. Buscar um corretor externo
        const corretorRes = await pool.query(`
      SELECT u.id, u.nome, u.tipo_corretor
      FROM users u
      JOIN user_role_assignments ura ON ura.user_id = u.id
      JOIN user_roles ur ON ur.id = ura.role_id
      WHERE ur.name = 'Corretor'
        AND u.ativo = true
        AND u.tipo_corretor = 'Externo'
      LIMIT 1
    `);

        if (corretorRes.rows.length === 0) {
            console.log('❌ Nenhum corretor externo encontrado!');
            return;
        }

        const corretor = corretorRes.rows[0];
        console.log(`✅ Corretor selecionado: ${corretor.nome} (${corretor.tipo_corretor})`);

        // 3. Criar atribuição já expirada
        const expiraEm = new Date(Date.now() - 2 * 60 * 1000); // 2 minutos atrás

        await pool.query(`
      INSERT INTO imovel_prospect_atribuicoes (
        prospect_id,
        corretor_fk,
        status,
        motivo,
        expira_em
      ) VALUES (15, $1, 'atribuido', '{"type":"test"}', $2)
      RETURNING id
    `, [corretor.id, expiraEm]);

        console.log(`✅ Atribuição criada (JÁ EXPIRADA)`);
        console.log(`   Expira em: ${expiraEm.toISOString()}`);
        console.log(`\n📋 Próximos passos:`);
        console.log(`   1. Execute: curl http://localhost:3000/api/cron/transbordo`);
        console.log(`   2. Verifique: node scripts/check-all-atribuicoes-15.js`);

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

createTestLead();

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

async function testTransbordo() {
    try {
        console.log('\n🧪 TESTE FINAL DE TRANSBORDO\n');
        console.log('='.repeat(60));

        // 1. Limpar prospect 16
        console.log('\n📋 PASSO 1: Limpando prospect 16...');
        await pool.query('DELETE FROM imovel_prospect_atribuicoes WHERE prospect_id = 16');
        console.log('✅ Atribuições deletadas');

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

        if (corretorRes.rows.length === 0) {
            console.log('❌ Nenhum corretor externo encontrado!');
            return;
        }

        const corretor = corretorRes.rows[0];
        console.log(`\n📋 PASSO 2: Criando atribuição inicial para ${corretor.nome}...`);

        // 3. Criar atribuição já expirada
        const expiraEm = new Date(Date.now() - 2 * 60 * 1000); // 2 minutos atrás
        await pool.query(`
      INSERT INTO imovel_prospect_atribuicoes (
        prospect_id,
        corretor_fk,
        status,
        motivo,
        expira_em
      ) VALUES (16, $1, 'atribuido', '{"type":"test"}', $2)
    `, [corretor.id, expiraEm]);

        console.log(`✅ Atribuição criada (JÁ EXPIRADA)`);
        console.log(`   Expira em: ${expiraEm.toISOString()}`);

        // 4. Executar cron
        console.log(`\n📋 PASSO 3: Executando cron...`);
        console.log('Execute: curl http://localhost:3000/api/cron/transbordo');
        console.log('\n📋 PASSO 4: Verificar resultado...');
        console.log('Execute: node scripts/investigate-prospect-16.js');

        console.log('\n' + '='.repeat(60));
        console.log('✅ Teste preparado! Execute os comandos acima.\n');

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

testTransbordo();

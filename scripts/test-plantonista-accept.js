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

async function testPlantonista() {
    try {
        console.log('\n🧪 Testando atribuição para plantonista...\n');

        // Buscar última atribuição
        const res = await pool.query(`
      SELECT 
        pa.id,
        pa.prospect_id,
        pa.status,
        pa.expira_em,
        u.nome as corretor_nome,
        u.tipo_corretor,
        u.is_plantonista,
        pa.motivo
      FROM imovel_prospect_atribuicoes pa
      JOIN users u ON u.id = pa.corretor_fk
      WHERE u.is_plantonista = true
      ORDER BY pa.created_at DESC
      LIMIT 1
    `);

        if (res.rows.length > 0) {
            const r = res.rows[0];
            console.log('📋 Última atribuição para plantonista:');
            console.log(`   Prospect ID: ${r.prospect_id}`);
            console.log(`   Corretor: ${r.corretor_nome}`);
            console.log(`   Tipo: ${r.tipo_corretor}`);
            console.log(`   Plantonista: ${r.is_plantonista}`);
            console.log(`   Status: ${r.status}`);
            console.log(`   Expira em: ${r.expira_em || 'NULL'}`);
            console.log(`   Motivo: ${JSON.stringify(r.motivo)}`);

            if (r.status === 'aceito' && r.expira_em === null) {
                console.log(`\n✅ CORRETO! Status='aceito' e expira_em=NULL`);
            } else {
                console.log(`\n❌ INCORRETO!`);
                console.log(`   Esperado: status='aceito', expira_em=NULL`);
                console.log(`   Obtido: status='${r.status}', expira_em=${r.expira_em}`);
            }
        } else {
            console.log('❌ Nenhuma atribuição para plantonista encontrada');
        }

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

testPlantonista();

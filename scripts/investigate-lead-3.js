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

async function investigateLead() {
    try {
        console.log('\n🔍 Investigando Lead ID 3, Prospect ID 12...\n');

        // 1. Verificar timezone atual
        const tzRes = await pool.query(`
      SELECT 
        NOW() as utc_now, 
        CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo' as brazil_now,
        EXTRACT(EPOCH FROM (NOW() - (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo'))) / 3600 as diff_hours
    `);
        console.log('⏰ Timezone do Servidor:');
        console.table(tzRes.rows);

        // 2. Buscar o lead específico
        const leadRes = await pool.query(`
      SELECT 
        pa.*,
        u.nome as corretor_nome,
        u.email as corretor_email,
        pa.expira_em < NOW() as expirado_utc,
        pa.expira_em < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo') as expirado_brazil,
        EXTRACT(EPOCH FROM (NOW() - pa.expira_em)) / 60 as minutos_desde_expiracao_utc,
        EXTRACT(EPOCH FROM ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo') - pa.expira_em)) / 60 as minutos_desde_expiracao_brazil
      FROM imovel_prospect_atribuicoes pa
      LEFT JOIN users u ON u.id = pa.corretor_fk
      WHERE pa.id = 3 AND pa.prospect_id = 12
    `);

        console.log('\n📋 Detalhes do Lead:\n');
        if (leadRes.rows.length > 0) {
            const lead = leadRes.rows[0];
            console.log('ID:', lead.id);
            console.log('Prospect ID:', lead.prospect_id);
            console.log('Corretor:', lead.corretor_nome);
            console.log('Status:', lead.status);
            console.log('Expira em:', lead.expira_em);
            console.log('Expirado (UTC):', lead.expirado_utc);
            console.log('Expirado (Brazil):', lead.expirado_brazil);
            console.log('Minutos desde expiração (UTC):', parseFloat(lead.minutos_desde_expiracao_utc).toFixed(2));
            console.log('Minutos desde expiração (Brazil):', parseFloat(lead.minutos_desde_expiracao_brazil).toFixed(2));
            console.log('\n📄 Dados completos:');
            console.log(JSON.stringify(lead, null, 2));
        } else {
            console.log('❌ Lead não encontrado!');
        }

        // 3. Verificar histórico de atribuições deste prospect
        const historyRes = await pool.query(`
      SELECT 
        pa.id,
        pa.corretor_fk,
        u.nome as corretor_nome,
        pa.status,
        pa.expira_em,
        pa.created_at
      FROM imovel_prospect_atribuicoes pa
      LEFT JOIN users u ON u.id = pa.corretor_fk
      WHERE pa.prospect_id = 12
      ORDER BY pa.created_at ASC
    `);

        console.log(`\n📜 Histórico de atribuições do Prospect 12:\n`);
        console.table(historyRes.rows);

        // 4. Verificar se há outros corretores na mesma área
        const prospectRes = await pool.query(`
      SELECT ip.*, i.cidade_fk, i.estado_fk
      FROM imovel_prospects ip
      JOIN imoveis i ON i.id = ip.id_imovel
      WHERE ip.id = 12
    `);

        if (prospectRes.rows.length > 0) {
            const prospect = prospectRes.rows[0];
            console.log('\n🏘️ Informações do Prospect:');
            console.log('Cidade FK:', prospect.cidade_fk);
            console.log('Estado FK:', prospect.estado_fk);

            // Buscar corretores na mesma área
            const corretoresRes = await pool.query(`
        SELECT 
          u.id,
          u.nome,
          u.email,
          ura.role_id,
          ur.name as role_name
        FROM users u
        JOIN user_role_assignments ura ON ura.user_id = u.id
        JOIN user_roles ur ON ur.id = ura.role_id
        WHERE ur.name = 'Corretor'
          AND u.ativo = true
        ORDER BY u.nome
      `);

            console.log(`\n👥 Corretores disponíveis (${corretoresRes.rows.length}):\n`);
            console.table(corretoresRes.rows);
        }

    } catch (err) {
        console.error('❌ Erro:', err);
    } finally {
        await pool.end();
    }
}

investigateLead();

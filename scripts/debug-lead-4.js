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

async function debugLead() {
    try {
        console.log('\n🔍 Investigando Lead ID 4, Prospect 13...\n');

        // 1. Verificar o lead
        const leadRes = await pool.query(`
      SELECT 
        pa.*,
        pa.expira_em < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo') as expirado_brazil,
        EXTRACT(EPOCH FROM ((CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo') - pa.expira_em)) / 60 as minutos_expirado
      FROM imovel_prospect_atribuicoes pa
      WHERE pa.id = 4 AND pa.prospect_id = 13
    `);

        console.log('📋 Status do Lead:');
        if (leadRes.rows.length > 0) {
            const lead = leadRes.rows[0];
            console.log(`   ID: ${lead.id}`);
            console.log(`   Prospect ID: ${lead.prospect_id}`);
            console.log(`   Status: ${lead.status}`);
            console.log(`   Corretor FK: ${lead.corretor_fk}`);
            console.log(`   Expira em: ${lead.expira_em}`);
            console.log(`   Expirado (Brazil TZ): ${lead.expirado_brazil}`);
            console.log(`   Minutos desde expiração: ${parseFloat(lead.minutos_expirado).toFixed(2)}`);
        } else {
            console.log('   ❌ Lead não encontrado!');
            return;
        }

        // 2. Verificar o imóvel e localização
        const prospectRes = await pool.query(`
      SELECT ip.*, i.codigo, i.cidade_fk, i.estado_fk, c.nome as cidade_nome, e.sigla as estado_sigla
      FROM imovel_prospects ip
      JOIN imoveis i ON i.id = ip.id_imovel
      LEFT JOIN cidades c ON c.id = i.cidade_fk
      LEFT JOIN estados e ON e.id = i.estado_fk
      WHERE ip.id = 13
    `);

        console.log('\n🏘️ Informações do Imóvel:');
        if (prospectRes.rows.length > 0) {
            const prospect = prospectRes.rows[0];
            console.log(`   Código: ${prospect.codigo}`);
            console.log(`   Cidade: ${prospect.cidade_nome} (FK: ${prospect.cidade_fk})`);
            console.log(`   Estado: ${prospect.estado_sigla} (FK: ${prospect.estado_fk})`);
        }

        // 3. Buscar corretores na área
        const corretoresRes = await pool.query(`
      SELECT 
        u.id,
        u.nome,
        u.email,
        caa.estado_fk,
        caa.cidade_fk,
        e.sigla as estado_sigla,
        c.nome as cidade_nome
      FROM corretor_areas_atuacao caa
      JOIN users u ON u.id = caa.corretor_fk
      LEFT JOIN estados e ON e.id = caa.estado_fk
      LEFT JOIN cidades c ON c.id = caa.cidade_fk
      WHERE caa.estado_fk = (SELECT estado_fk FROM imoveis WHERE id = (SELECT id_imovel FROM imovel_prospects WHERE id = 13))
        AND (caa.cidade_fk IS NULL OR caa.cidade_fk = (SELECT cidade_fk FROM imoveis WHERE id = (SELECT id_imovel FROM imovel_prospects WHERE id = 13)))
        AND u.ativo = true
      ORDER BY u.nome
    `);

        console.log(`\n👥 Corretores disponíveis na área (${corretoresRes.rows.length}):`);
        if (corretoresRes.rows.length > 0) {
            console.table(corretoresRes.rows.map(r => ({
                id: r.id.substring(0, 8) + '...',
                nome: r.nome,
                estado: r.estado_sigla,
                cidade: r.cidade_nome || 'TODO ESTADO'
            })));
        } else {
            console.log('   ❌ Nenhum corretor encontrado!');
        }

        // 4. Verificar histórico de atribuições
        const historyRes = await pool.query(`
      SELECT pa.id, pa.corretor_fk, u.nome, pa.status, pa.created_at
      FROM imovel_prospect_atribuicoes pa
      JOIN users u ON u.id = pa.corretor_fk
      WHERE pa.prospect_id = 13
      ORDER BY pa.created_at
    `);

        console.log(`\n📜 Histórico de atribuições:`);
        console.table(historyRes.rows.map(r => ({
            id: r.id,
            corretor: r.nome,
            status: r.status,
            created_at: r.created_at
        })));

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

debugLead();

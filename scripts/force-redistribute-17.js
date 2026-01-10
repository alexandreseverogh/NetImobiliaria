const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const http = require('http');

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

async function forceRedistribute17() {
    try {
        console.log('\n🔧 Forçando redistribuição do Prospect 17...\n');

        // 1. Verificar estado atual
        const currentRes = await pool.query(`
      SELECT pa.id, pa.status, pa.corretor_fk, u.nome
      FROM imovel_prospect_atribuicoes pa
      JOIN users u ON u.id = pa.corretor_fk
      WHERE pa.prospect_id = 17
      ORDER BY pa.created_at DESC
      LIMIT 1
    `);

        if (currentRes.rows.length === 0) {
            console.log('❌ Nenhuma atribuição encontrada!');
            return;
        }

        const current = currentRes.rows[0];
        console.log(`📋 Estado atual:`);
        console.log(`   ID: ${current.id}`);
        console.log(`   Status: ${current.status}`);
        console.log(`   Corretor: ${current.nome}`);

        if (current.status !== 'expirado') {
            console.log(`\n⚠️  Status não é 'expirado', marcando agora...`);
            await pool.query(`UPDATE imovel_prospect_atribuicoes SET status = 'expirado' WHERE id = $1`, [current.id]);
        }

        // 2. Buscar corretores disponíveis (excluindo o que já recebeu)
        const corretoresRes = await pool.query(`
      SELECT u.id, u.nome, u.tipo_corretor
      FROM users u
      JOIN user_role_assignments ura ON ura.user_id = u.id
      JOIN user_roles ur ON ur.id = ura.role_id
      JOIN corretor_areas_atuacao caa ON caa.corretor_fk = u.id
      JOIN imovel_prospects ip ON ip.id = 17
      JOIN imoveis i ON i.id = ip.id_imovel
      WHERE ur.name = 'Corretor'
        AND u.ativo = true
        AND u.tipo_corretor = 'Externo'
        AND caa.estado_fk = i.estado_fk
        AND caa.cidade_fk = i.cidade_fk
        AND u.id != $1
      LIMIT 1
    `, [current.corretor_fk]);

        if (corretoresRes.rows.length === 0) {
            console.log('\n❌ Nenhum corretor EXTERNO disponível na área!');
            return;
        }

        const novoCorretor = corretoresRes.rows[0];
        console.log(`\n✅ Novo corretor selecionado: ${novoCorretor.nome} (${novoCorretor.tipo_corretor})`);

        // 3. Criar nova atribuição
        const expiraEm = new Date(Date.now() + 60 * 60 * 1000); // 1 hora
        await pool.query(`
      INSERT INTO imovel_prospect_atribuicoes (
        prospect_id,
        corretor_fk,
        status,
        motivo,
        expira_em
      ) VALUES (17, $1, 'atribuido', '{"type":"manual_redistribution"}', $2)
      RETURNING id
    `, [novoCorretor.id, expiraEm]);

        console.log(`✅ Nova atribuição criada!`);
        console.log(`   Expira em: ${expiraEm.toISOString()}`);
        console.log(`\n🎉 Redistribuição concluída com sucesso!`);

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

forceRedistribute17();

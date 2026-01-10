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

async function investigateProspect18() {
    try {
        console.log('\n🔍 Investigando Prospect 18...\n');

        // 1. Verificar atribuições
        const atribuicoesRes = await pool.query(`
      SELECT 
        pa.id,
        pa.status,
        pa.corretor_fk,
        u.nome as corretor_nome,
        u.tipo_corretor,
        pa.created_at,
        pa.expira_em,
        pa.expira_em < NOW() as expirado_utc,
        EXTRACT(EPOCH FROM (NOW() - pa.expira_em)) / 60 as minutos_expirado
      FROM imovel_prospect_atribuicoes pa
      JOIN users u ON u.id = pa.corretor_fk
      WHERE pa.prospect_id = 18
      ORDER BY pa.created_at
    `);

        console.log(`📋 Atribuições do Prospect 18: ${atribuicoesRes.rows.length}\n`);

        if (atribuicoesRes.rows.length > 0) {
            console.table(atribuicoesRes.rows.map(r => ({
                id: r.id,
                corretor: r.corretor_nome.substring(0, 20),
                tipo: r.tipo_corretor,
                status: r.status,
                expirado: r.expirado_utc,
                minutos_exp: parseFloat(r.minutos_expirado).toFixed(2),
                created_at: r.created_at.toISOString().substring(0, 19)
            })));

            const expirados = atribuicoesRes.rows.filter(r => r.status === 'expirado');
            const atribuidos = atribuicoesRes.rows.filter(r => r.status === 'atribuido');

            console.log(`\n📊 Resumo:`);
            console.log(`   - Total: ${atribuicoesRes.rows.length}`);
            console.log(`   - Expirados: ${expirados.length}`);
            console.log(`   - Atribuídos (ativos): ${atribuidos.length}`);

            if (expirados.length > 0 && atribuidos.length === 0) {
                console.log(`\n❌ CONFIRMADO: Lead expirou mas não foi redistribuído!`);
                console.log(`\n💡 Possíveis causas:`);
                console.log(`   1. Cron não executou após a expiração`);
                console.log(`   2. routeProspectAndNotify falhou silenciosamente`);
                console.log(`   3. Não há corretores disponíveis na área`);
                console.log(`   4. Erro ao criar nova atribuição (constraint)`);
            }
        }

        // 2. Verificar prospect e imóvel
        const prospectRes = await pool.query(`
      SELECT ip.id, ip.id_cliente, i.id as imovel_id, i.cidade_fk, i.estado_fk
      FROM imovel_prospects ip
      JOIN imoveis i ON i.id = ip.id_imovel
      WHERE ip.id = 18
    `);

        if (prospectRes.rows.length > 0) {
            const p = prospectRes.rows[0];
            console.log(`\n🏘️ Prospect e Imóvel:`);
            console.log(`   Prospect ID: ${p.id}`);
            console.log(`   Cliente: ${p.id_cliente || 'NULL'}`);
            console.log(`   Imóvel ID: ${p.imovel_id}`);
            console.log(`   Cidade FK: ${p.cidade_fk}`);
            console.log(`   Estado FK: ${p.estado_fk}`);

            // 3. Verificar corretores disponíveis
            const corretoresRes = await pool.query(`
        SELECT u.id, u.nome, u.tipo_corretor
        FROM users u
        JOIN user_role_assignments ura ON ura.user_id = u.id
        JOIN user_roles ur ON ur.id = ura.role_id
        JOIN corretor_areas_atuacao caa ON caa.corretor_fk = u.id
        WHERE ur.name = 'Corretor'
          AND u.ativo = true
          AND u.tipo_corretor = 'Externo'
          AND caa.estado_fk = $1
          AND caa.cidade_fk = $2
      `, [p.estado_fk, p.cidade_fk]);

            console.log(`\n👥 Corretores EXTERNOS disponíveis: ${corretoresRes.rows.length}`);
            if (corretoresRes.rows.length > 0) {
                console.table(corretoresRes.rows.map(r => ({
                    id: r.id.substring(0, 8) + '...',
                    nome: r.nome.substring(0, 20),
                    tipo: r.tipo_corretor
                })));
            } else {
                console.log(`   ⚠️  NENHUM corretor externo na área!`);
            }
        }

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

investigateProspect18();

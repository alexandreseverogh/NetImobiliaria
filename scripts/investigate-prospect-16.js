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

async function investigateProspect16() {
    try {
        console.log('\n🔍 Investigando Prospect 16...\n');

        // 1. Verificar atribuições
        const atribuicoesRes = await pool.query(`
      SELECT 
        pa.id,
        pa.status,
        pa.corretor_fk,
        u.nome as corretor_nome,
        u.tipo_corretor,
        u.is_plantonista,
        pa.created_at,
        pa.expira_em,
        pa.expira_em < NOW() as expirado
      FROM imovel_prospect_atribuicoes pa
      JOIN users u ON u.id = pa.corretor_fk
      WHERE pa.prospect_id = 16
      ORDER BY pa.created_at
    `);

        console.log(`📋 Atribuições do Prospect 16: ${atribuicoesRes.rows.length}\n`);

        if (atribuicoesRes.rows.length > 0) {
            console.table(atribuicoesRes.rows.map(r => ({
                id: r.id,
                corretor: r.corretor_nome.substring(0, 20),
                tipo: r.tipo_corretor,
                plantonista: r.is_plantonista,
                status: r.status,
                expirado: r.expirado,
                created_at: r.created_at.toISOString().substring(0, 19)
            })));

            const expirados = atribuicoesRes.rows.filter(r => r.status === 'expirado');
            const atribuidos = atribuicoesRes.rows.filter(r => r.status === 'atribuido');
            const expiradosNaoMarcados = atribuicoesRes.rows.filter(r => r.expirado && r.status === 'atribuido');

            console.log(`\n📊 Resumo:`);
            console.log(`   - Total: ${atribuicoesRes.rows.length}`);
            console.log(`   - Expirados (marcados): ${expirados.length}`);
            console.log(`   - Atribuídos (ativos): ${atribuidos.length}`);
            console.log(`   - Expirados mas não marcados: ${expiradosNaoMarcados.length}`);

            if (expiradosNaoMarcados.length > 0) {
                console.log(`\n⚠️  PROBLEMA: ${expiradosNaoMarcados.length} atribuição(ões) expirada(s) mas com status 'atribuido'!`);
            }

            if (expirados.length > 0 && atribuidos.length === 0) {
                console.log(`\n❌ PROBLEMA: Lead expirou mas não foi redistribuído!`);
            }
        } else {
            console.log('❌ Nenhuma atribuição encontrada para Prospect 16');
        }

        // 2. Verificar o imóvel
        const imovelRes = await pool.query(`
      SELECT i.id, i.codigo, i.cidade_fk, i.estado_fk
      FROM imovel_prospects ip
      JOIN imoveis i ON i.id = ip.id_imovel
      WHERE ip.id = 16
    `);

        if (imovelRes.rows.length > 0) {
            const imovel = imovelRes.rows[0];
            console.log(`\n🏘️ Imóvel:`);
            console.log(`   Código: ${imovel.codigo}`);
            console.log(`   Cidade FK: ${imovel.cidade_fk}`);
            console.log(`   Estado FK: ${imovel.estado_fk}`);

            // 3. Verificar corretores disponíveis
            const corretoresRes = await pool.query(`
        SELECT 
          u.id,
          u.nome,
          u.tipo_corretor,
          u.is_plantonista
        FROM users u
        JOIN user_role_assignments ura ON ura.user_id = u.id
        JOIN user_roles ur ON ur.id = ura.role_id
        JOIN corretor_areas_atuacao caa ON caa.corretor_fk = u.id
        WHERE ur.name = 'Corretor'
          AND u.ativo = true
          AND caa.estado_fk = $1
          AND caa.cidade_fk = $2
          AND u.tipo_corretor = 'Externo'
        ORDER BY u.nome
      `, [imovel.estado_fk, imovel.cidade_fk]);

            console.log(`\n👥 Corretores EXTERNOS na área: ${corretoresRes.rows.length}`);
            if (corretoresRes.rows.length > 0) {
                console.table(corretoresRes.rows.map(r => ({
                    id: r.id.substring(0, 8) + '...',
                    nome: r.nome.substring(0, 20),
                    tipo: r.tipo_corretor
                })));
            }
        }

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

investigateProspect16();

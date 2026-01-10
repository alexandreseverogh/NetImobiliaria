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

async function investigateProspect15() {
    try {
        console.log('\n🔍 Investigando Prospect 15...\n');

        // 1. Verificar o imóvel e localização
        const imovelRes = await pool.query(`
      SELECT 
        i.id,
        i.codigo,
        i.cidade_fk,
        i.estado_fk,
        ip.id as prospect_id
      FROM imovel_prospects ip
      JOIN imoveis i ON i.id = ip.id_imovel
      WHERE ip.id = 15
    `);

        if (imovelRes.rows.length === 0) {
            console.log('❌ Prospect 15 não encontrado!');
            return;
        }

        const imovel = imovelRes.rows[0];
        console.log('🏘️ Imóvel:');
        console.log(`   ID: ${imovel.id}`);
        console.log(`   Código: ${imovel.codigo}`);
        console.log(`   Cidade FK: ${imovel.cidade_fk}`);
        console.log(`   Estado FK: ${imovel.estado_fk}`);

        // 2. Verificar atribuições
        const atribuicoesRes = await pool.query(`
      SELECT 
        pa.id,
        pa.status,
        pa.corretor_fk,
        u.nome as corretor_nome,
        u.tipo_corretor,
        pa.created_at,
        pa.expira_em
      FROM imovel_prospect_atribuicoes pa
      JOIN users u ON u.id = pa.corretor_fk
      WHERE pa.prospect_id = 15
      ORDER BY pa.created_at
    `);

        console.log(`\n📋 Atribuições (${atribuicoesRes.rows.length}):`);
        console.table(atribuicoesRes.rows.map(r => ({
            id: r.id,
            corretor: r.corretor_nome.substring(0, 20),
            tipo: r.tipo_corretor,
            status: r.status,
            created_at: r.created_at
        })));

        // 3. Buscar corretores disponíveis na mesma área
        const corretoresRes = await pool.query(`
      SELECT 
        u.id,
        u.nome,
        u.tipo_corretor,
        u.is_plantonista,
        caa.estado_fk,
        caa.cidade_fk
      FROM users u
      JOIN user_role_assignments ura ON ura.user_id = u.id
      JOIN user_roles ur ON ur.id = ura.role_id
      JOIN corretor_areas_atuacao caa ON caa.corretor_fk = u.id
      WHERE ur.name = 'Corretor'
        AND u.ativo = true
        AND caa.estado_fk = $1
        AND caa.cidade_fk = $2
      ORDER BY u.tipo_corretor, u.is_plantonista
    `, [imovel.estado_fk, imovel.cidade_fk]);

        console.log(`\n👥 Corretores na área (${corretoresRes.rows.length}):`);
        console.table(corretoresRes.rows.map(r => ({
            id: r.id.substring(0, 8) + '...',
            nome: r.nome.substring(0, 20),
            tipo: r.tipo_corretor,
            plantonista: r.is_plantonista
        })));

        // 4. Verificar se há corretores externos disponíveis
        const externosDisponiveis = corretoresRes.rows.filter(r =>
            r.tipo_corretor === 'Externo' &&
            !atribuicoesRes.rows.some(a => a.corretor_fk === r.id)
        );

        console.log(`\n📊 Análise:`);
        console.log(`   - Total de corretores na área: ${corretoresRes.rows.length}`);
        console.log(`   - Corretores EXTERNOS disponíveis: ${externosDisponiveis.length}`);
        console.log(`   - Atribuições já feitas: ${atribuicoesRes.rows.length}`);

        if (externosDisponiveis.length > 0) {
            console.log(`\n✅ Há ${externosDisponiveis.length} corretor(es) EXTERNO(S) disponível(is):`);
            externosDisponiveis.forEach(c => {
                console.log(`   - ${c.nome}`);
            });
        } else {
            console.log(`\n⚠️  Nenhum corretor EXTERNO disponível (todos já receberam ou não há externos na área)`);
        }

        // 5. Verificar se há atribuição ativa bloqueando
        const ativaRes = await pool.query(`
      SELECT id, status FROM imovel_prospect_atribuicoes
      WHERE prospect_id = 15 AND status IN ('atribuido', 'aceito')
    `);

        if (ativaRes.rows.length > 0) {
            console.log(`\n⚠️  PROBLEMA: Há ${ativaRes.rows.length} atribuição(ões) ATIVA(S) bloqueando:`);
            console.table(ativaRes.rows);
            console.log(`   Isso impede a criação de nova atribuição!`);
        }

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

investigateProspect15();

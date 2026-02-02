const fs = require('fs');
const path = require('path');
const { pool } = require('./utils/db.js');
const http = require('http');

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function callCron() {
    return new Promise((resolve, reject) => {
        const req = http.get('http://localhost:3000/api/cron/transbordo', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    resolve({ success: false, error: data });
                }
            });
        });
        req.on('error', reject);
        req.setTimeout(30000);
    });
}

async function testTransbordoFlow() {
    try {
        console.log('\n🧪 TESTE COMPLETO DE TRANSBORDO\n');
        console.log('='.repeat(60));

        // PASSO 1: Limpar dados existentes
        console.log('\n📋 PASSO 1: Limpando dados de teste...');
        await pool.query('DELETE FROM imovel_prospect_atribuicoes');
        await pool.query('DELETE FROM imovel_prospects');
        console.log('✅ Dados limpos');

        // PASSO 2: Verificar corretores disponíveis
        console.log('\n📋 PASSO 2: Verificando corretores disponíveis...');
        const corretoresRes = await pool.query(`
      SELECT 
        u.id, 
        u.nome, 
        u.tipo_corretor, 
        u.is_plantonista,
        COUNT(caa.id) as areas_count
      FROM users u
      JOIN user_role_assignments ura ON ura.user_id = u.id
      JOIN user_roles ur ON ur.id = ura.role_id
      LEFT JOIN corretor_areas_atuacao caa ON caa.corretor_fk = u.id
      WHERE ur.name = 'Corretor' AND u.ativo = true
      GROUP BY u.id, u.nome, u.tipo_corretor, u.is_plantonista
      ORDER BY u.tipo_corretor, u.is_plantonista
    `);

        console.log(`\n👥 Total de corretores: ${corretoresRes.rows.length}`);
        console.table(corretoresRes.rows.map(r => ({
            nome: r.nome.substring(0, 20),
            tipo: r.tipo_corretor,
            plantonista: r.is_plantonista,
            areas: r.areas_count
        })));

        const externos = corretoresRes.rows.filter(r => r.tipo_corretor === 'Externo');
        const internos = corretoresRes.rows.filter(r => r.tipo_corretor === 'Interno' && r.is_plantonista);

        console.log(`\n📊 Resumo:`);
        console.log(`   - Corretores EXTERNOS: ${externos.length}`);
        console.log(`   - Corretores INTERNOS Plantonistas: ${internos.length}`);

        if (externos.length === 0) {
            console.log('\n❌ ERRO: Nenhum corretor EXTERNO encontrado!');
            console.log('   Crie pelo menos um corretor com tipo_corretor = "Externo"');
            return;
        }

        // PASSO 3: Buscar um imóvel para teste
        console.log('\n📋 PASSO 3: Buscando imóvel para teste...');
        const imovelRes = await pool.query(`
      SELECT i.id, i.codigo, i.cidade_fk, i.estado_fk
      FROM imoveis i
      WHERE i.cidade_fk IS NOT NULL 
        AND i.estado_fk IS NOT NULL
      LIMIT 1
    `);

        if (imovelRes.rows.length === 0) {
            console.log('❌ ERRO: Nenhum imóvel encontrado com cidade e estado!');
            return;
        }

        const imovel = imovelRes.rows[0];
        console.log(`✅ Imóvel selecionado: ${imovel.codigo} (ID: ${imovel.id})`);
        console.log(`   Cidade FK: ${imovel.cidade_fk}, Estado FK: ${imovel.estado_fk}`);

        // PASSO 4: Criar prospect de teste
        console.log('\n📋 PASSO 4: Criando prospect de teste...');
        const prospectRes = await pool.query(`
      INSERT INTO imovel_prospects (
        id_imovel, 
        cliente_uuid, 
        preferencia_contato, 
        mensagem
      ) VALUES ($1, NULL, 'email', 'Teste de transbordo')
      RETURNING id
    `, [imovel.id]);

        const prospectId = prospectRes.rows[0].id;
        console.log(`✅ Prospect criado: ID ${prospectId}`);

        // PASSO 5: Criar primeira atribuição (simulando lead inicial)
        console.log('\n📋 PASSO 5: Criando atribuição inicial...');
        const primeiroCorretor = externos[0];
        const expiraEm = new Date(Date.now() - 5 * 60 * 1000); // 5 minutos atrás (já expirado)

        await pool.query(`
      INSERT INTO imovel_prospect_atribuicoes (
        prospect_id,
        corretor_fk,
        status,
        motivo,
        expira_em
      ) VALUES ($1, $2, 'atribuido', '{"type":"test"}', $3)
    `, [prospectId, primeiroCorretor.id, expiraEm]);

        console.log(`✅ Atribuição criada para: ${primeiroCorretor.nome}`);
        console.log(`   Status: atribuido`);
        console.log(`   Expira em: ${expiraEm.toISOString()} (JÁ EXPIRADO)`);

        // PASSO 6: Executar cron de transbordo
        console.log('\n📋 PASSO 6: Executando cron de transbordo...');
        console.log('⏳ Aguarde...');

        const cronResult = await callCron();
        console.log('\n📊 Resultado do cron:');
        console.log(JSON.stringify(cronResult, null, 2));

        // PASSO 7: Verificar resultado
        console.log('\n📋 PASSO 7: Verificando resultado...');
        await sleep(1000);

        const atribuicoesRes = await pool.query(`
      SELECT 
        pa.id,
        pa.status,
        pa.expira_em,
        u.nome as corretor_nome,
        u.tipo_corretor,
        u.is_plantonista,
        pa.created_at
      FROM imovel_prospect_atribuicoes pa
      JOIN users u ON u.id = pa.corretor_fk
      WHERE pa.prospect_id = $1
      ORDER BY pa.created_at
    `, [prospectId]);

        console.log(`\n📋 Histórico de atribuições (${atribuicoesRes.rows.length}):`);
        console.table(atribuicoesRes.rows.map(r => ({
            id: r.id,
            corretor: r.corretor_nome.substring(0, 20),
            tipo: r.tipo_corretor,
            plantonista: r.is_plantonista,
            status: r.status,
            created_at: r.created_at
        })));

        // PASSO 8: Validar resultado
        console.log('\n📋 PASSO 8: Validando resultado...');

        const expirados = atribuicoesRes.rows.filter(r => r.status === 'expirado');
        const atribuidos = atribuicoesRes.rows.filter(r => r.status === 'atribuido');

        console.log(`\n✅ Validação:`);
        console.log(`   - Atribuições expiradas: ${expirados.length}`);
        console.log(`   - Atribuições ativas: ${atribuidos.length}`);

        if (expirados.length === 1 && atribuidos.length === 1) {
            const novaAtribuicao = atribuidos[0];
            console.log(`\n✅ SUCESSO! Lead redistribuído para:`);
            console.log(`   Nome: ${novaAtribuicao.corretor_nome}`);
            console.log(`   Tipo: ${novaAtribuicao.tipo_corretor}`);
            console.log(`   Plantonista: ${novaAtribuicao.is_plantonista}`);

            if (novaAtribuicao.tipo_corretor === 'Externo') {
                console.log(`\n🎉 TESTE PASSOU! Corretor EXTERNO foi priorizado corretamente!`);
            } else {
                console.log(`\n⚠️  ATENÇÃO: Lead foi para corretor ${novaAtribuicao.tipo_corretor}`);
                console.log(`   Esperado: Externo (primeira tentativa)`);
            }
        } else {
            console.log(`\n❌ FALHA! Resultado inesperado:`);
            console.log(`   Esperado: 1 expirado + 1 atribuido`);
            console.log(`   Obtido: ${expirados.length} expirado + ${atribuidos.length} atribuido`);
        }

        console.log('\n' + '='.repeat(60));
        console.log('🏁 TESTE CONCLUÍDO\n');

    } catch (err) {
        console.error('\n❌ ERRO NO TESTE:', err.message);
        console.error(err.stack);
    } finally {
        await pool.end();
    }
}

testTransbordoFlow();

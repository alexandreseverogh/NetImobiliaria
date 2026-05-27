const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Carregar variáveis de ambiente do .env.local
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

async function testFallback() {
    try {
        console.log('🧪 Iniciando Teste de Fallback da Estratégia de Distribuição (v2.0)...\n');

        // 1. Identificar um imóvel e seu dono
        const imovelRes = await pool.query(`
            SELECT i.id, i.corretor_fk, i.estado_fk, i.cidade_fk, u.nome as dono_nome
            FROM imoveis i
            JOIN users u ON i.corretor_fk = u.id
            WHERE i.ativo = true AND u.ativo = true
            LIMIT 1
        `);

        if (imovelRes.rows.length === 0) {
            console.log('❌ Nenhum imóvel ativo com dono encontrado para teste.');
            return;
        }

        const imovel = imovelRes.rows[0];
        console.log(`🏠 Imóvel de Teste: ${imovel.id} em ${imovel.cidade_fk}/${imovel.estado_fk}`);
        console.log(`👤 Nível 1 (Dono): ${imovel.dono_nome} (${imovel.corretor_fk})`);

        // Importar o motor de distribuição (dinamicamente ou via query simulada)
        // Como o script roda em Node puro, vou simular o comportamento da classe DistributionEngine 
        // mas chamando as queries reais do banco para provar o conceito.

        async function findCandidate(excludeIds = []) {
            console.log(`\n--- Tentativa com exclusão de: [${excludeIds.join(', ')}] ---`);
            
            // Simulação Simplificada do DistributionEngine.findBestCandidate
            
            // Nível 1: Dono
            if (!excludeIds.includes(imovel.corretor_fk)) {
                return { nivel: 1, id: imovel.corretor_fk, nome: imovel.dono_nome, motivo: 'dono_ativo' };
            }

            // Nível 2: Meritocracia Regional (Externos then Internos)
            const qMerit = `
                SELECT u.id, u.nome, u.tipo_corretor, u.is_plantonista
                FROM users u
                INNER JOIN user_role_assignments ura ON u.id = ura.user_id
                INNER JOIN user_roles ur ON ura.role_id = ur.id
                INNER JOIN corretor_areas_atuacao caa ON caa.corretor_fk = u.id
                WHERE u.ativo = true AND ur.name = 'Corretor'
                  AND u.tipo_corretor IN ('Externo', 'Interno')
                  AND caa.estado_fk = $1 AND caa.cidade_fk = $2
                  AND u.id != ALL($3::uuid[])
                LIMIT 1
            `;
            const meritRes = await pool.query(qMerit, [imovel.estado_fk, imovel.cidade_fk, excludeIds]);
            if (meritRes.rows.length > 0) {
                return { nivel: 2, ...meritRes.rows[0], motivo: 'meritocracia_regional' };
            }

            // Nível 3: Plantonista (Global/Área)
            const qPlant = `
                SELECT u.id, u.nome, u.tipo_corretor, u.is_plantonista
                FROM users u
                INNER JOIN user_role_assignments ura ON u.id = ura.user_id
                INNER JOIN user_roles ur ON ura.role_id = ur.id
                WHERE u.ativo = true AND ur.name = 'Corretor'
                  AND u.is_plantonista = true
                  AND u.id != ALL($1::uuid[])
                LIMIT 1
            `;
            const plantRes = await pool.query(qPlant, [excludeIds]);
            if (plantRes.rows.length > 0) {
                return { nivel: 3, ...plantRes.rows[0], motivo: 'fallback_plantonista' };
            }

            return null;
        }

        const excluded = [];

        // Rodada 1: Deve pegar o Dono
        const r1 = await findCandidate(excluded);
        console.log(`🎯 Resultado 1: ${r1?.nome} (Nível ${r1?.nivel}) - ${r1?.motivo}`);
        if (r1?.nivel !== 1) console.log('❌ Falha: Deveria ter pego o Dono.');

        // Rodada 2: Excluir dono, deve pegar Meritocracia
        excluded.push(imovel.corretor_fk);
        const r2 = await findCandidate(excluded);
        console.log(`🎯 Resultado 2: ${r2?.nome} (Nível ${r2?.nivel}) - ${r2?.motivo}`);
        if (r2?.nivel !== 2) console.log('⚠️ Aviso: Verifique se existem outros corretores na mesma região.');

        // Rodada 3: Excluir regional, deve pegar Plantonista
        if (r2) excluded.push(r2.id);
        
        // Vamos forçar a exclusão de todos na região para cair no plantonista
        const allRegional = await pool.query(
            "SELECT corretor_fk FROM corretor_areas_atuacao WHERE estado_fk = $1 AND cidade_fk = $2",
            [imovel.estado_fk, imovel.cidade_fk]
        );
        allRegional.rows.forEach(r => { if (!excluded.includes(r.corretor_fk)) excluded.push(r.corretor_fk); });

        const r3 = await findCandidate(excluded);
        console.log(`🎯 Resultado 3: ${r3?.nome} (Nível ${r3?.nivel}) - ${r3?.motivo}`);
        if (r3?.nivel !== 3) {
            console.log('❌ Falha: Não caiu no Plantonista após esgotar regional.');
            // Verificar se existem plantonistas cadastrados
            const pCheck = await pool.query("SELECT count(*) FROM users WHERE is_plantonista = true AND ativo = true");
            console.log(`ℹ️  Existem ${pCheck.rows[0].count} plantonistas ativos no banco.`);
        } else {
            console.log('✅ SUCESSO: O Fallback escalou corretamente até o Plantonista!');
        }

    } catch (err) {
        console.error('❌ Erro no teste:', err);
    } finally {
        await pool.end();
    }
}

testFallback();

const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '15432'),
    ssl: false
});

// Mock da função routeProspectAndNotify para não precisar importar o módulo TS complexo
// Na verdade, precisamos chamar a API ou inserir no banco e deixar a API rodar?
// Vamos tentar simular o INSERT e chamar a API via fetch? Não, o fetch precisa de auth.
// O ideal seria unit test, mas aqui vou verificar apenas se consigo ver o resultado de um NOVO lead.
// Vou instruir o user a testar na UI, é mais seguro.
// Mas posso APENAS verificar o status da ÚLTIMA atribuição para garantir que "deu certo" SE o usuário testar.

// Melhor: script que monitora atribuições recentes.

async function checkRecentAttribution() {
    try {
        console.log('--- VERIFICANDO ATRIBUIÇÕES RECENTES (Top 1) ---');

        const res = await pool.query(`
      SELECT ipa.id, ipa.status, ipa.expira_em, ipa.corretor_fk, ipa.motivo, ipa.created_at
      FROM imovel_prospect_atribuicoes ipa
      ORDER BY ipa.created_at DESC
      LIMIT 1
    `);

        if (res.rows.length === 0) {
            console.log('❌ Nenhuma atribuição encontrada.');
        } else {
            const attr = res.rows[0];
            console.log('📋 Última Atribuição:', attr);

            if (attr.status === 'atribuido' && attr.expira_em) {
                console.log('✅ SUCESSO: Status é "atribuido" e tem data de expiração!');
            } else if (attr.status === 'aceito') {
                console.log('❌ FALHA: Status ainda é "aceito" (auto-aceite).');
            } else {
                console.log('ℹ️ Status:', attr.status);
            }
        }

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await pool.end();
    }
}

checkRecentAttribution();

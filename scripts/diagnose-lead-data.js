const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: 15432, // Porta do Docker
    database: process.env.DB_NAME || 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres',
});

const CORRETOR_ID = '43b2242a-cbea-4696-9e29-3987211188a3';

async function main() {
    try {
        console.log('Investigando último lead do corretor:', CORRETOR_ID, 'na porta 15432');

        // 1. Verificar Usuario
        const userRes = await pool.query('SELECT nome, email FROM users WHERE id = $1', [CORRETOR_ID]);
        if (userRes.rows.length === 0) {
            console.log('❌ Usuário não encontrado no banco.');
            return;
        }
        const user = userRes.rows[0];
        console.log('✅ Corretor:', user.nome, 'Email:', user.email);

        // 2. Buscar última atribuição
        const lastAttr = await pool.query(`
      SELECT * FROM imovel_prospect_atribuicoes 
      WHERE corretor_fk = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `, [CORRETOR_ID]);

        if (lastAttr.rows.length === 0) {
            console.log('❌ Nenhuma atribuição encontrada para este corretor em imovel_prospect_atribuicoes.');
        } else {
            const attr = lastAttr.rows[0];
            console.log(`✅ Última Atribuição encontrada ID: ${attr.id}`);
            console.log(`   Prospect ID: ${attr.prospect_id}`);
            console.log(`   Data: ${attr.created_at}`);
            console.log(`   Motivo:`, attr.motivo);
        }

        // 3. Check Email Logs
        console.log('\n--- EMAIL LOGS ---');
        const logs = await pool.query(`
        SELECT template_name, success, error_message, sent_at 
        FROM email_logs 
        WHERE to_email = $1 
        ORDER BY sent_at DESC 
        LIMIT 5
    `, [user.email]);

        if (logs.rows.length === 0) {
            console.log('❌ NENHUM LOG DE E-MAIL ENCONTRADO para este endereço.');
        } else {
            console.log('Últimos 5 logs de email:');
            console.log(JSON.stringify(logs.rows, null, 2));
        }

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        pool.end();
    }
}

main();

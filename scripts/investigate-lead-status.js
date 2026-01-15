
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function investigate() {
    try {
        // 1. Check Imovel 145
        const iRes = await pool.query('SELECT id, corretor_fk, titulo FROM imoveis WHERE id = 145');
        console.log('--- IMÓVEL 145 ---');
        console.log(iRes.rows[0]);

        // 2. Check Broker
        const brokerId = '43b2242a-cbea-4696-9e29-3987211188a3';
        const uRes = await pool.query('SELECT id, nome, email, ativo FROM users WHERE id = $1', [brokerId]);
        console.log('\n--- CORRETOR ---');
        console.log(uRes.rows[0]);

        // 3. Check Email Logs (Latest 5)
        const eRes = await pool.query('SELECT * FROM email_logs ORDER BY sent_at DESC LIMIT 5');
        console.log('\n--- EMAIL LOGS (Latest 5) ---');
        console.table(eRes.rows.map(r => ({ to: r.to_email, template: r.template_name, success: r.success, error: r.error_message, at: r.sent_at })));

        await pool.end();
    } catch (err) {
        console.error('Erro:', err);
        await pool.end();
    }
}

investigate();

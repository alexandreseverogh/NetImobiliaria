
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

async function checkEmail() {
    try {
        const brokerId = '43b2242a-cbea-4696-9e29-3987211188a3';

        // Check Broker Email
        const uRes = await pool.query('SELECT email FROM users WHERE id = $1', [brokerId]);
        const email = uRes.rows[0]?.email;
        console.log(`Corretor Email: ${email}`);

        if (email) {
            // Check Logs
            const lRes = await pool.query(`
        SELECT template_name, success, error_message, sent_at 
        FROM email_logs 
        WHERE to_email = $1 
        ORDER BY sent_at DESC 
        LIMIT 3
      `, [email]);

            console.log('--- LOGS DE EMAIL ---');
            console.log(JSON.stringify(lRes.rows, null, 2));
        }

        await pool.end();
    } catch (err) {
        console.error('Erro:', err);
        await pool.end();
    }
}

checkEmail();

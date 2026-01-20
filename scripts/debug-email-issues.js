const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '15432'),
    ssl: false
});

async function debugEmail() {
    try {
        console.log('--- DEBUG EMAIL ISSUES ---');

        // 1. Check Broker CRECI
        const email = 'alexandreseverog@gmail.com';
        const brokerRes = await pool.query("SELECT id, nome, email, creci FROM users WHERE email = $1", [email]);
        if (brokerRes.rows.length === 0) {
            console.log(`❌ Broker with email ${email} not found.`);
        } else {
            console.log('👤 Broker Data:', brokerRes.rows[0]);
        }

        // 2. Check 'novo-lead-corretor' template for \r\n
        // Use raw select to see literal characters
        const tplRes = await pool.query("SELECT html_content FROM email_templates WHERE name = 'novo-lead-corretor'");
        if (tplRes.rows.length > 0) {
            const html = tplRes.rows[0].html_content;
            console.log('\n📧 Template "novo-lead-corretor" analysis:');

            // Check for literal "\r\n" strings (escaped in DB?)
            // Or actual newlines that might be rendered poorly
            const hasLiteralRN = html.includes('\\r\\n');
            const hasLiteralN = html.includes('\\n');

            console.log(`Contains literal "\\r\\n"? ${hasLiteralRN}`);
            console.log(`Contains literal "\\n"? ${hasLiteralN}`);

            // Show a snippet around "Mensagem"
            const idx = html.indexOf('Mensagem:');
            if (idx !== -1) {
                console.log('📝 Snippet around "Mensagem":');
                console.log(JSON.stringify(html.substring(idx, idx + 200))); // JSON stringify to reveal escapes
            }
        } else {
            console.log('❌ Template "novo-lead-corretor" not found.');
        }

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await pool.end();
    }
}

debugEmail();

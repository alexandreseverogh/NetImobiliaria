const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '15432'),
    ssl: false
});

async function fixEmailData() {
    try {
        console.log('--- FIXING EMAIL DATA ---');

        // 1. Fix Broker CRECI
        const email = 'alexandreseverog@gmail.com';
        const creci = '12345-F'; // Fake CRECI for testing
        console.log(`🔧 Updating CRECI for ${email} to ${creci}...`);
        await pool.query("UPDATE users SET creci = $1 WHERE email = $2", [creci, email]);

        // 2. Clean Template `novo-lead-corretor`
        console.log('🧹 Cleaning \\r\\n from template "novo-lead-corretor"...');

        // Fetch
        const res = await pool.query("SELECT html_content FROM email_templates WHERE name = 'novo-lead-corretor'");
        if (res.rows.length > 0) {
            let html = res.rows[0].html_content;

            // Replace literal \r\n and \n with spaces (or empty string if inside tags)
            // Be careful not to break HTML. Usually safe to replace with space.
            // The user showed "\r\n" appearing in the TEXT.
            // It seems the template might have PLACEDHOLDERS like {{mensagem}} surrounded by \r\n.
            // Let's replace global \r\n with space.

            // This regex handles literal backslash+r+n
            // html = html.replace(/\\r\\n/g, ' '); 
            // NOTE: Postgres driver might return interpreted string.
            // The previous debug showed "Contains literal \r\n? true".

            html = html.replace(/\\r\\n/g, ''); // Remove completely
            html = html.replace(/\\n/g, '');     // Remove completely
            html = html.replace(/\r\n/g, '');    // Remove actual newlines
            html = html.replace(/\n/g, '');      // Remove actual newlines

            await pool.query("UPDATE email_templates SET html_content = $1 WHERE name = 'novo-lead-corretor'", [html]);
            console.log('✅ Template cleaned.');
        }

    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await pool.end();
    }
}

fixEmailData();

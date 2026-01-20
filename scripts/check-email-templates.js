const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'net_imobiliaria',
    password: process.env.DB_PASSWORD || 'postgres',
    port: parseInt(process.env.DB_PORT || '15432'),
    ssl: false
});

async function checkTemplate() {
    try {
        console.log('--- CHECKING EMAIL TEMPLATE ---');
        const res = await pool.query("SELECT * FROM email_templates WHERE name = 'lead_accepted_client_notification'");
        if (res.rows.length === 0) {
            console.log('❌ Template not found.');
        } else {
            const t = res.rows[0];
            const html = t.html_content;

            // Search for the section title
            // It might be bounded by <h3> or <h2> or similar
            const term = 'Proprietário';
            const sectionIdx = html.indexOf(term);

            console.log('📧 Subject:', t.subject);

            if (sectionIdx !== -1) {
                console.log('📝 Owner Section Context:');
                // Get a healthy chunk around it to identify the container div
                console.log(html.substring(Math.max(0, sectionIdx - 200), sectionIdx + 500));
            } else {
                console.log('❌ "Proprietário" section not found in HTML.');
                console.log(html.substring(0, 500));
            }
        }
    } catch (err) {
        console.error('Erro:', err);
    } finally {
        await pool.end();
    }
}

checkTemplate();

const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres',
});

async function readTemplate() {
    try {
        const res = await pool.query("SELECT html_content, variables FROM email_templates WHERE name = 'password_reset'");
        if (res.rows.length > 0) {
            const content = res.rows[0].html_content;
            fs.writeFileSync('scripts/template_content.html', content);
            console.log("Written to scripts/template_content.html");
        } else {
            console.log("Template not found");
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

readTemplate();


const { Pool } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '15432'),
    database: process.env.DB_NAME || 'net_imobiliaria',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

async function findLinks() {
    try {
        const res = await pool.query("SELECT name, html_content FROM email_templates");
        let out = '';
        res.rows.forEach(row => {
            const matches = row.html_content.match(/<a[^>]*>.*?<\/a>/g);
            if (matches) matches.forEach(m => out += row.name + ' : ' + m + '\n');
        });
        fs.writeFileSync('all_links_found.txt', out);
        console.log('Saved links to all_links_found.txt');
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

findLinks();

const { pool } = require('./utils/db.js');

async function main() {
    try {
        const res = await pool.query("SELECT * FROM email_templates WHERE name = 'novo-lead-corretor'");
        if (res.rows.length === 0) {
            console.log('❌ Template novo-lead-corretor NÃO encontrado no Docker!');
        } else {
            const t = res.rows[0];
            console.log('✅ Template encontrado.');
            console.log('Assunto:', t.subject);
            console.log('HTML (trecho):', t.html_content.substring(0, 200));
            console.log('Tem proprietario_nome?', t.html_content.includes('{{proprietario_nome}}'));
            console.log('Variáveis:', t.variables);
        }
    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

main();

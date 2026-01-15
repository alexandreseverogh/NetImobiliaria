const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'net_imobiliaria',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Roberto@2007',
});

async function main() {
    try {
        const result = await pool.query(`
      SELECT * FROM email_templates 
      WHERE name IN ('novo-lead-corretor-imovel-fk')
    `);

        console.log('Templates encontrados:', result.rows.length);

        for (const template of result.rows) {
            console.log('--- TEMPLATE:', template.name, '---');
            console.log('Assunto:', template.subject);
            console.log('Variáveis declaradas:', template.variables);
            console.log('Conteúdo HTML:', template.html_content);

            // Verificar se variáveis importantes estão no HTML
            const checkVars = [
                'proprietario_nome', 'proprietario_telefone',
                'cliente_nome', 'cliente_telefone', 'mensagem',
                'titulo', 'codigo'
            ];

            console.log('Verificação de variáveis no HTML:');
            for (const v of checkVars) {
                const hasVar = template.html_content && template.html_content.includes(`{{${v}}}`);
                console.log(`- {{${v}}}: ${hasVar ? '✅' : '❌'}`);
            }
        }
    } catch (err) {
        console.error('Erro:', err);
    } finally {
        pool.end();
    }
}

main();

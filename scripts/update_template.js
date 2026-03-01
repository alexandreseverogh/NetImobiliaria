const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres',
});

async function updateTemplate() {
    const newHtml = `<html><body><h2>Net Imobiliaria</h2><h3>Redefinição de Senha</h3><p>Olá,</p><p>Você solicitou a redefinição da senha da sua conta no sistema Net Imobiliária.</p><div style="background-color: #f1f5f9; border: 1px solid #e2e8f0; padding: 20px; margin: 20px 0; color: #1e293b; border-radius: 8px; text-align: center;"><p style="margin-bottom: 15px;">Utilize o código abaixo no campo de verificação que já está aberto no site:</p><div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #3b82f6; margin: 10px 0; font-family: monospace;">{{code}}</div></div><div style="background-color: #fff3cd; border: 1px solid #ffeeba; padding: 15px; margin: 20px 0; color: #856404; border-radius: 8px; font-size: 14px;"><strong>Observação:</strong><br>Este código é válido por 15 minutos. Caso você tenha fechado a janela do site, será necessário iniciar o processo novamente informando seu e-mail.</div><div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; text-align: center;"><p>Este é um e-mail automático, por favor não responda.</p><p>© 2024 Net Imobiliária. Todos os direitos reservados.</p></div></body></html>`;

    try {
        const variables = JSON.stringify(["code", "nome"]);
        const res = await pool.query(
            "UPDATE email_templates SET html_content = $1, variables = $2 WHERE name = 'password_reset'",
            [newHtml, variables]
        );
        console.log(`Updated ${res.rowCount} row(s)`);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

updateTemplate();

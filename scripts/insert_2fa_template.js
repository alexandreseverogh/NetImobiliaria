
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

function loadEnvFile() {
    const envPath = path.join(__dirname, '../.env.local');
    const envVars = {};
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
                const [key, ...valueParts] = trimmedLine.split('=');
                if (key && valueParts.length > 0) {
                    envVars[key] = valueParts.join('=').trim();
                }
            }
        }
    }
    return envVars;
}

async function run() {
    const envVars = loadEnvFile();
    const config = {
        host: envVars.POSTGRES_HOST || 'localhost',
        port: parseInt(envVars.POSTGRES_PORT) || 5432,
        database: envVars.POSTGRES_DB || 'net_imobiliaria',
        user: envVars.POSTGRES_USER || 'postgres',
        password: envVars.POSTGRES_PASSWORD || 'Roberto@2007'
    };

    const client = new Client(config);
    await client.connect();

    const templateName = '2fa-code';
    const subject = 'Seu Código de Verificação - Net Imobiliária';
    const htmlContent = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
  <div style="text-align: center; margin-bottom: 20px;">
    <h2 style="color: #0056b3;">Código de Verificação</h2>
  </div>
  <p>Olá,</p>
  <p>Você solicitou um código de verificação para acessar sua conta.</p>
  <div style="background-color: #f8f9fa; padding: 15px; text-align: center; border-radius: 4px; margin: 20px 0;">
    <span style="font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #333;">{{code}}</span>
  </div>
  <p>Este código expira em 10 minutos.</p>
  <p>Se você não solicitou este código, por favor ignore este email.</p>
  <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
  <p style="font-size: 12px; color: #777; text-align: center;">Net Imobiliária - Segurança</p>
</div>
  `;
    const textContent = `Seu código de verificação é: {{code}}. Ele expira em 10 minutos.`;

    try {
        // Check if exists
        const res = await client.query('SELECT id FROM email_templates WHERE name = $1', [templateName]);

        if (res.rows.length > 0) {
            console.log(`✅ Template '${templateName}' already exists.`);
        } else {
            console.log(`Inserting template '${templateName}'...`);
            await client.query(`
            INSERT INTO email_templates (name, subject, html_content, text_content, variables, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
        `, [templateName, subject, htmlContent, textContent, ['code']]);
            console.log(`✅ Template '${templateName}' inserted successfully.`);
        }

        // Also insert '2fa_verification' just in case (as used in EmailService method)
        const altName = '2fa_verification';
        const resAlt = await client.query('SELECT id FROM email_templates WHERE name = $1', [altName]);
        if (resAlt.rows.length === 0) {
            console.log(`Inserting template '${altName}' (alias)...`);
            await client.query(`
            INSERT INTO email_templates (name, subject, html_content, text_content, variables, is_active, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
        `, [altName, subject, htmlContent, textContent, ['code']]);
            console.log(`✅ Template '${altName}' inserted successfully.`);
        }

    } catch (err) {
        console.error('Error inserting template:', err);
    }

    await client.end();
}

run();

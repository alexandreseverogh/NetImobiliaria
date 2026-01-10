
// We need to use ts-node or run compiled js. 
// Since we are in JS land for scripts, I will copy the logic of EmailService into this script 
// to simulate exactly what it does, using the same DB connection and modules.

const { Client } = require('pg');
const nodemailer = require('nodemailer');
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
        host: envVars.DB_HOST || envVars.POSTGRES_HOST || 'localhost',
        port: parseInt(envVars.DB_PORT || envVars.POSTGRES_PORT || '15432'),
        database: envVars.DB_NAME || envVars.POSTGRES_DB || 'net_imobiliaria',
        user: envVars.DB_USER || envVars.POSTGRES_USER || 'postgres',
        password: envVars.DB_PASSWORD || envVars.POSTGRES_PASSWORD || 'Roberto@2007'
    };

    const client = new Client(config);
    await client.connect();
    console.log('Connected to DB.');

    try {
        // 1. Load Settings
        console.log('Loading settings...');
        const settingsRes = await client.query('SELECT * FROM email_settings WHERE is_active = true LIMIT 1');
        if (settingsRes.rows.length === 0) throw new Error('No active email settings');
        const settings = settingsRes.rows[0];

        // 2. Create Transporter
        console.log(`Creating transporter for ${settings.smtp_host}:${settings.smtp_port}...`);
        const transporter = nodemailer.createTransport({
            host: settings.smtp_host,
            port: settings.smtp_port,
            secure: settings.smtp_secure,
            auth: {
                user: settings.smtp_username,
                pass: settings.smtp_password
            }
        });

        console.log('Verifying connection...');
        await transporter.verify();
        console.log('✅ SMTP Connection OK');

        // 3. Load Template
        console.log("Loading template '2fa-code'...");
        const tplRes = await client.query("SELECT * FROM email_templates WHERE name = '2fa-code' AND is_active = true");
        if (tplRes.rows.length === 0) throw new Error("Template '2fa-code' not found or inactive");
        const tpl = tplRes.rows[0];
        console.log("✅ Template loaded.");

        // 4. Send Email
        const code = '123456';
        let htmlContent = tpl.html_content.replace('{{code}}', code);
        let textContent = tpl.text_content.replace('{{code}}', code);

        console.log('Sending email...');
        const info = await transporter.sendMail({
            from: `"${settings.from_name}" <${settings.from_email}>`,
            to: 'alexandreseverog@gmail.com', // sending to self for test
            subject: tpl.subject,
            html: htmlContent,
            text: textContent
        });
        console.log('✅ Email sent: ' + info.messageId);

    } catch (err) {
        console.error('❌ FAILED:', err);
    } finally {
        await client.end();
    }
}

run();

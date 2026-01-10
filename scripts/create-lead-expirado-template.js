const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envConfig = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envConfig[key.trim()] = value.trim();
    }
});

const pool = new Pool({
    user: envConfig.DB_USER,
    host: envConfig.DB_HOST,
    database: envConfig.DB_NAME,
    password: envConfig.DB_PASSWORD,
    port: parseInt(envConfig.DB_PORT || '5432'),
});

async function createLeadExpiradoTemplate() {
    try {
        console.log('\n📧 Criando template de email "lead-expirado"...\n');

        // Verificar se já existe
        const existsRes = await pool.query(`SELECT id FROM email_templates WHERE name = 'lead-expirado'`);

        if (existsRes.rows.length > 0) {
            console.log('⚠️  Template já existe! Atualizando...');

            await pool.query(`
        UPDATE email_templates
        SET 
          subject = 'Lead Expirado - Ação Necessária',
          html_content = $1,
          text_content = $2,
          variables = $3
        WHERE name = 'lead-expirado'
      `, [
                `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Lead Expirado</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #d32f2f;">⏰ Lead Expirado</h2>
    <p>Olá <strong>{{nome_corretor}}</strong>,</p>
    <p>Informamos que o lead do imóvel <strong>{{codigo_imovel}}</strong> expirou por falta de resposta dentro do prazo estabelecido.</p>
    <p>Este lead foi redistribuído para outro corretor da equipe.</p>
    <p><strong>Importante:</strong> Uma penalidade foi aplicada em sua pontuação de gamificação.</p>
    <p>Para evitar futuras penalidades, certifique-se de responder aos leads dentro do prazo de SLA.</p>
    <hr style="border: 1px solid #eee; margin: 20px 0;">
    <p style="font-size: 12px; color: #666;">
      NetImobiliária - Sistema de Gestão de Leads
    </p>
  </div>
</body>
</html>
        `,
                'Olá {{nome_corretor}}, o lead do imóvel {{codigo_imovel}} expirou. Uma penalidade foi aplicada.',
                JSON.stringify(['nome_corretor', 'codigo_imovel'])
            ]);

            console.log('✅ Template atualizado com sucesso!');
        } else {
            console.log('➕ Criando novo template...');

            await pool.query(`
        INSERT INTO email_templates (name, subject, html_content, text_content, variables)
        VALUES ('lead-expirado', $1, $2, $3, $4)
      `, [
                'Lead Expirado - Ação Necessária',
                `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Lead Expirado</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #d32f2f;">⏰ Lead Expirado</h2>
    <p>Olá <strong>{{nome_corretor}}</strong>,</p>
    <p>Informamos que o lead do imóvel <strong>{{codigo_imovel}}</strong> expirou por falta de resposta dentro do prazo estabelecido.</p>
    <p>Este lead foi redistribuído para outro corretor da equipe.</p>
    <p><strong>Importante:</strong> Uma penalidade foi aplicada em sua pontuação de gamificação.</p>
    <p>Para evitar futuras penalidades, certifique-se de responder aos leads dentro do prazo de SLA.</p>
    <hr style="border: 1px solid #eee; margin: 20px 0;">
    <p style="font-size: 12px; color: #666;">
      NetImobiliária - Sistema de Gestão de Leads
    </p>
  </div>
</body>
</html>
        `,
                'Olá {{nome_corretor}}, o lead do imóvel {{codigo_imovel}} expirou. Uma penalidade foi aplicada.',
                JSON.stringify(['nome_corretor', 'codigo_imovel'])
            ]);

            console.log('✅ Template criado com sucesso!');
        }

    } catch (err) {
        console.error('❌ Erro:', err.message);
    } finally {
        await pool.end();
    }
}

createLeadExpiradoTemplate();

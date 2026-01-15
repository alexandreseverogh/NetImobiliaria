const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'net_imobiliaria',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Roberto@2007',
});

const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Lead Expirado</title>
</head>
<body style="font-family: sans-serif; background-color: #f4f4f4; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; border-left: 6px solid #ef4444;">
    <h2 style="color: #ef4444; margin-top: 0;">Lead Expirado</h2>
    <p>Olá <strong>{{nome_corretor}}</strong>,</p>
    <p>O tempo de SLA para aceite do lead do imóvel <strong>{{codigo_imovel}}</strong> expirou.</p>
    <div style="background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 4px; font-weight: bold; display: inline-block;">
      SLA {{sla_minutos}} min
    </div>
    <p>O lead foi redistribuído automaticamente para outro corretor.</p>
    <p style="color: #666; font-size: 12px; margin-top: 20px;">Fique atento ao painel para não perder novas oportunidades.</p>
  </div>
</body>
</html>`;

const textContent = `Lead Expirado - Imóvel {{codigo_imovel}}

Olá {{nome_corretor}},

O tempo de SLA para aceite do lead do imóvel {{codigo_imovel}} expirou (SLA {{sla_minutos}} min).
O lead foi redistribuído.
`;

const variables = JSON.stringify(["nome_corretor", "codigo_imovel", "sla_minutos"]);

async function main() {
  try {
    console.log('Criando template lead-expirado...');

    await pool.query(`
      INSERT INTO email_templates (name, subject, html_content, text_content, variables, is_active)
      VALUES ($1, $2, $3, $4, $5::jsonb, true)
      ON CONFLICT (name) DO UPDATE SET
        subject = EXCLUDED.subject,
        html_content = EXCLUDED.html_content,
        text_content = EXCLUDED.text_content,
        variables = EXCLUDED.variables,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP
    `, ['lead-expirado', '⏳ Lead Expirado - Imóvel {{codigo_imovel}}', htmlContent, textContent, variables]);

    console.log('✅ Template lead-expirado criado/atualizado com sucesso.');

  } catch (err) {
    console.error('❌ Erro ao criar template:', err);
  } finally {
    pool.end();
  }
}

main();

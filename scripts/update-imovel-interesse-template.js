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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Novo interesse em imóvel</title>
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
  <div style="max-width: 760px; margin: 0 auto; background-color: white; padding: 0;">
    <div style="background: linear-gradient(135deg, #0f766e 0%, #115e59 100%); padding: 26px; text-align: left; color: white;">
      <div style="font-size: 14px; opacity: 0.9;">Net Imobiliária</div>
      <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 800;">Novo interesse registrado</h1>
      <div style="margin-top: 10px; font-size: 14px; opacity: 0.95;">Cliente demonstrou interesse via site</div>
    </div>

    <div style="padding: 26px;">
      <p style="margin: 0 0 12px 0; color: #111827; font-size: 16px;"><strong>Olá!</strong></p>
      <p style="margin: 0 0 18px 0; color: #374151; font-size: 15px; line-height: 1.6;">
        Um novo lead foi gerado através da página pública do imóvel. Abaixo estão os detalhes completos.
      </p>

      <!-- BLOCO 1: IMÓVEL -->
      <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <div style="font-size: 12px; color: #6b7280; font-weight: 800; text-transform: uppercase; letter-spacing: .08em;">Imóvel</div>
        <div style="margin-top: 6px; color: #374151; font-size: 14px;">Código: <strong>{{codigo}}</strong></div>
        <div style="margin-top: 6px; color: #374151; font-size: 14px;">Finalidade: <strong>{{finalidade}}</strong></div>
        <div style="margin-top: 10px; color: #111827; font-size: 18px; font-weight: 900;">{{preco}}</div>

        <div style="margin-top: 12px; font-size: 13px; color: #111827; line-height: 1.5;">
          <div style="margin-top: 8px;"><strong>Endereço:</strong> {{endereco_completo}}</div>
          <div style="margin-top: 6px;"><strong>Cidade/UF:</strong> {{cidade}} / {{estado}}</div>
          <div style="margin-top: 6px;"><strong>Área total:</strong> {{area_total}}</div>
          <div style="margin-top: 6px;"><strong>Quartos:</strong> {{quartos}} · <strong>Suítes:</strong> {{suites}} · <strong>Vagas:</strong> {{garagens}}</div>
        </div>
      </div>

      <!-- BLOCO 2: PROPRIETÁRIO -->
      <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <div style="font-size: 12px; color: #9a3412; font-weight: 800; text-transform: uppercase; letter-spacing: .08em;">Proprietário</div>
        <div style="margin-top: 8px; color: #111827; font-size: 15px;"><strong>{{proprietario_nome}}</strong></div>
        <div style="margin-top: 6px; color: #111827; font-size: 13px;">CPF: {{proprietario_cpf}}</div>
        <div style="margin-top: 6px; color: #111827; font-size: 13px;">Telefone: {{proprietario_telefone}}</div>
        <div style="margin-top: 6px; color: #111827; font-size: 13px;">E-mail: {{proprietario_email}}</div>
        <div style="margin-top: 8px; color: #111827; font-size: 13px;"><strong>Endereço:</strong> {{proprietario_endereco_completo}}</div>
      </div>

      <!-- BLOCO 3: CLIENTE (Tenho interesse) -->
      <div style="background: #ecfeff; border: 1px solid #cffafe; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <div style="font-size: 12px; color: #0f766e; font-weight: 800; text-transform: uppercase; letter-spacing: .08em;">Cliente (Tenho interesse)</div>
        <div style="margin-top: 8px; color: #0f172a; font-size: 15px;"><strong>{{cliente_nome}}</strong></div>
        <div style="margin-top: 6px; color: #0f172a; font-size: 14px;">{{cliente_telefone}}</div>
        <div style="margin-top: 6px; color: #0f172a; font-size: 14px;">{{cliente_email}}</div>
        <div style="margin-top: 10px; color: #0f172a; font-size: 13px;">Data do interesse: <strong>{{data_interesse}}</strong></div>
        <div style="margin-top: 8px; color: #0f172a; font-size: 13px;">Preferência de contato: <strong>{{preferencia_contato}}</strong></div>
        <div style="margin-top: 8px; color: #0f172a; font-size: 13px;">Mensagem: <em style="white-space: pre-wrap;">{{mensagem}}</em></div>
      </div>

      <div style="border-top: 1px solid #e5e7eb; margin-top: 18px; padding-top: 14px; color: #6b7280; font-size: 12px;">
        <div>Este é um e-mail automático do sistema.</div>
      </div>
    </div>
  </div>
</body>
</html>`;

const textContent = `Novo interesse registrado - {{codigo}}

IMÓVEL
Código: {{codigo}}
Finalidade: {{finalidade}}
Preço: {{preco}}
Endereço: {{endereco_completo}}

PROPRIETÁRIO
Nome: {{proprietario_nome}}
CPF: {{proprietario_cpf}}
Telefone: {{proprietario_telefone}}
Email: {{proprietario_email}}

CLIENTE
Nome: {{cliente_nome}}
Telefone: {{cliente_telefone}}
Email: {{cliente_email}}
Mensagem: {{mensagem}}
`;

const variables = JSON.stringify([
    "codigo", "finalidade", "preco", "endereco_completo", "cidade", "estado",
    "area_total", "quartos", "suites", "garagens",
    "proprietario_nome", "proprietario_cpf", "proprietario_telefone", "proprietario_email", "proprietario_endereco_completo",
    "cliente_nome", "cliente_telefone", "cliente_email", "data_interesse", "preferencia_contato", "mensagem"
]);

async function main() {
    try {
        console.log('Atualizando template imovel-interesse...');

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
    `, ['imovel-interesse', 'Novo Interesse em Imóvel - {{codigo}}', htmlContent, textContent, variables]);

        console.log('✅ Template atualizado com sucesso.');

    } catch (err) {
        console.error('❌ Erro ao atualizar template:', err);
    } finally {
        pool.end();
    }
}

main();

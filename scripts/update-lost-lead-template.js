const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: 15432,
    database: 'net_imobiliaria',
    user: 'postgres',
    password: 'postgres'
});

const newHtml = `<!DOCTYPE html>
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
    
    <div style="background: #fee2e2; color: #991b1b; padding: 10px; border-radius: 4px; font-weight: bold; display: inline-block; margin-bottom: 20px;">
      SLA {{sla_minutos}} min
    </div>

    <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; background-color: #f9fafb;">
      <h3 style="margin-top: 0; color: #374151; font-size: 16px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Dados do Imóvel</h3>
      <p style="margin: 10px 0; font-weight: bold; font-size: 18px; color: #111827;">{{imovel_titulo}}</p>
      <p style="margin: 5px 0; color: #4b5563;"><strong>Código:</strong> {{imovel_codigo}}</p>
      <p style="margin: 5px 0; color: #4b5563;"><strong>Finalidade:</strong> {{finalidade_nome}} · <strong>Tipo:</strong> {{tipo_nome}} · <strong>Status:</strong> {{status_nome}}</p>
      <p style="margin: 15px 0; font-size: 20px; color: #059669; font-weight: bold;">{{imovel_preco}}</p>
      <p style="margin: 10px 0; color: #4b5563;"><strong>Descrição:</strong> {{imovel_descricao}}</p>
      <p style="margin: 5px 0; color: #4b5563;"><strong>Endereço:</strong> {{imovel_endereco}}</p>
      <p style="margin: 5px 0; color: #4b5563;"><strong>Cidade/UF:</strong> {{imovel_cidade_uf}}</p>
      <p style="margin: 5px 0; color: #4b5563;"><strong>Detalhes:</strong> {{imovel_detalhes}}</p>
    </div>

    <p style="margin-top: 20px;">O lead foi redistribuído automaticamente para outro corretor.</p>
    <p style="color: #666; font-size: 12px; margin-top: 20px;">Fique atento ao painel para não perder novas oportunidades.</p>
  </div>
</body>
</html>`;

async function run() {
    try {
        const variables = [
            "nome_corretor", "codigo_imovel", "sla_minutos",
            "imovel_titulo", "imovel_codigo", "tipo_nome", "finalidade_nome", "status_nome",
            "imovel_preco", "imovel_descricao", "imovel_endereco", "imovel_cidade_uf", "imovel_detalhes"
        ];

        await pool.query(
            "UPDATE email_templates SET html_content = $1, variables = $2, updated_at = NOW() WHERE name = 'lead-expirado'",
            [newHtml, JSON.stringify(variables)]
        );
        console.log('✅ Template lead-expirado atualizado com sucesso!');
    } catch (e) {
        console.error('❌ Erro ao atualizar template:', e);
    } finally {
        await pool.end();
    }
}
run();

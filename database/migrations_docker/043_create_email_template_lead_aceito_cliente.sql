-- 043_create_email_template_lead_aceito_cliente.sql
-- Cria template de notificação para o cliente quando o lead é aceito (Manual ou Auto).
-- GARANTE PRIVACIDADE: Não contém dados do proprietário (para evitar bypass).
-- Idempotente (UPSERT via ON CONFLICT).

BEGIN;

INSERT INTO email_templates (name, subject, html_content, text_content, variables, is_active)
VALUES (
  'lead-aceito-cliente',
  'Um corretor está cuidando do seu interesse no imóvel {{imovel_codigo}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lead em Atendimento</title>
</head>
<body style="font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
  <div style="max-width: 700px; margin: 0 auto; background-color: white; padding: 0;">
    <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 26px; text-align: left; color: white;">
      <div style="font-size: 14px; opacity: 0.9;">Net Imobiliária</div>
      <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 800;">Boa notícia! Você será atendido.</h1>
      <div style="margin-top: 10px; font-size: 14px; opacity: 0.95;">Um de nossos corretores já assumiu seu interesse no imóvel.</div>
    </div>

    <div style="padding: 26px;">
      <p style="margin: 0 0 12px 0; color: #111827; font-size: 16px;"><strong>Olá, {{cliente_nome}}!</strong></p>
      <p style="margin: 0 0 18px 0; color: #374151; font-size: 15px; line-height: 1.6;">
        Recebemos seu interesse e já designamos um especialista para cuidar do seu atendimento. Em breve entrarão em contato.
      </p>

      <!-- CORRETOR -->
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <div style="font-size: 12px; color: #15803d; font-weight: 800; text-transform: uppercase; letter-spacing: .08em;">Seu Corretor</div>
        <div style="margin-top: 10px; color: #111827; font-size: 18px; font-weight: 800;">{{corretor_nome}}</div>
        
        <div style="margin-top: 12px; font-size: 14px; color: #374151;">
          <div style="display: flex; align-items: center; margin-bottom: 6px;">
            <span style="font-weight: 600; width: 80px;">E-mail:</span> 
            <span>{{corretor_email}}</span>
          </div>
          <div style="display: flex; align-items: center; margin-bottom: 6px;">
            <span style="font-weight: 600; width: 80px;">Telefone:</span> 
            <span>{{corretor_telefone}}</span>
          </div>
          <div style="display: flex; align-items: center;">
            <span style="font-weight: 600; width: 80px;">CRECI:</span> 
            <span>{{corretor_creci}}</span>
          </div>
        </div>
      </div>

      <!-- IMÓVEL (Resumo) -->
      <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <div style="font-size: 12px; color: #6b7280; font-weight: 800; text-transform: uppercase; letter-spacing: .08em;">Imóvel de Interesse</div>
        <div style="margin-top: 10px; color: #111827; font-size: 16px; font-weight: 800;">{{imovel_titulo}}</div>
        <div style="margin-top: 6px; color: #374151; font-size: 14px;">Código: <strong>{{imovel_codigo}}</strong></div>
        <div style="margin-top: 6px; color: #374151; font-size: 14px;">{{cidade_estado}}</div>
        <div style="margin-top: 8px; color: #111827; font-size: 15px; font-weight: 700;">{{preco}}</div>
      </div>

      <div style="border-top: 1px solid #e5e7eb; margin-top: 24px; padding-top: 14px; color: #6b7280; font-size: 12px;">
        <div>Dica: Se preferir, você também pode entrar em contato diretamente com o corretor pelos canais acima.</div>
      </div>
    </div>
  </div>
</body>
</html>',
  'Um corretor está cuidando do seu interesse no imóvel {{imovel_codigo}}

Olá, {{cliente_nome}}!

Um de nossos corretores já assumiu seu interesse no imóvel.

SEU CORRETOR:
Nome: {{corretor_nome}}
Email: {{corretor_email}}
Telefone: {{corretor_telefone}}
CRECI: {{corretor_creci}}

IMÓVEL:
{{imovel_titulo}}
Código: {{imovel_codigo}}
Local: {{cidade_estado}}
Preço: {{preco}}

Em breve entrarão em contato.
',
  '["cliente_nome","imovel_titulo","imovel_codigo","cidade_estado","preco","corretor_nome","corretor_email","corretor_telefone","corretor_creci"]'::jsonb,
  true
)
ON CONFLICT (name)
DO UPDATE SET
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content,
  text_content = EXCLUDED.text_content,
  variables = EXCLUDED.variables,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

COMMIT;

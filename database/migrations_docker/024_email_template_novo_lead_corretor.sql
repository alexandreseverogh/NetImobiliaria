-- 024_email_template_novo_lead_corretor.sql
-- Template de email: notificar corretor quando um novo lead (prospect de imóvel) for atribuído e exigir aceite.
-- Idempotente (UPSERT via ON CONFLICT).

BEGIN;

INSERT INTO email_templates (name, subject, html_content, text_content, variables, is_active)
VALUES (
  'novo-lead-corretor',
  'Novo lead para você (aceite necessário) — {{codigo}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Novo lead atribuído</title>
</head>
<body style="font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
  <div style="max-width: 700px; margin: 0 auto; background-color: white; padding: 0;">
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e40af 100%); padding: 26px; text-align: left; color: white;">
      <div style="font-size: 14px; opacity: 0.9;">Net Imobiliária</div>
      <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 800;">Você recebeu um novo lead</h1>
      <div style="margin-top: 10px; font-size: 14px; opacity: 0.95;">Aceite necessário para começar o atendimento</div>
    </div>

    <div style="padding: 26px;">
      <p style="margin: 0 0 12px 0; color: #111827; font-size: 16px;"><strong>Olá, {{corretor_nome}}!</strong></p>
      <p style="margin: 0 0 18px 0; color: #374151; font-size: 15px; line-height: 1.6;">
        Um cliente demonstrou interesse em um imóvel dentro da sua área de atuação. Para iniciar o atendimento, acesse o painel e <strong>aceite o lead</strong>.
      </p>

      <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <div style="font-size: 12px; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: .08em;">Imóvel</div>
        <div style="margin-top: 8px; color: #111827; font-size: 16px; font-weight: 700;">{{titulo}}</div>
        <div style="margin-top: 6px; color: #374151; font-size: 14px;">Código: <strong>{{codigo}}</strong></div>
        <div style="margin-top: 6px; color: #374151; font-size: 14px;">{{cidade}} / {{estado}}</div>
        <div style="margin-top: 10px; color: #111827; font-size: 18px; font-weight: 800;">{{preco}}</div>
      </div>

      <div style="background: #ecfeff; border: 1px solid #cffafe; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <div style="font-size: 12px; color: #0f766e; font-weight: 800; text-transform: uppercase; letter-spacing: .08em;">Cliente</div>
        <div style="margin-top: 8px; color: #0f172a; font-size: 15px;"><strong>{{cliente_nome}}</strong></div>
        <div style="margin-top: 6px; color: #0f172a; font-size: 14px;">{{cliente_telefone}}</div>
        <div style="margin-top: 6px; color: #0f172a; font-size: 14px;">{{cliente_email}}</div>
        <div style="margin-top: 10px; color: #0f172a; font-size: 13px;">
          Preferência de contato: <strong>{{preferencia_contato}}</strong>
        </div>
        <div style="margin-top: 10px; color: #0f172a; font-size: 13px;">
          Mensagem: <em style="white-space: pre-wrap;">{{mensagem}}</em>
        </div>
      </div>

      <div style="text-align: center; margin: 22px 0;">
        <a href="{{painel_url}}"
           style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 18px; border-radius: 12px; font-weight: 800;">
          Abrir painel e aceitar lead
        </a>
      </div>

      <div style="border-top: 1px solid #e5e7eb; margin-top: 18px; padding-top: 14px; color: #6b7280; font-size: 12px;">
        <div>Este é um e-mail automático. Para evitar perda de timing, aceite e contate o cliente o quanto antes.</div>
      </div>
    </div>
  </div>
</body>
</html>',
  'Novo lead atribuído (aceite necessário) — {{codigo}}

Olá, {{corretor_nome}}!

Imóvel:
- Código: {{codigo}}
- Título: {{titulo}}
- Cidade/UF: {{cidade}} / {{estado}}
- Preço: {{preco}}

Cliente:
- Nome: {{cliente_nome}}
- Telefone: {{cliente_telefone}}
- Email: {{cliente_email}}
- Preferência de contato: {{preferencia_contato}}
- Mensagem: {{mensagem}}

Acesse o painel para aceitar o lead: {{painel_url}}
',
  '["corretor_nome","codigo","titulo","cidade","estado","preco","cliente_nome","cliente_telefone","cliente_email","preferencia_contato","mensagem","painel_url"]'::jsonb,
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



-- 029_update_email_template_lead_perdido_sla_pedagogico.sql
-- Atualiza template: lead-perdido-sla para incluir SLA (minutos) e tentativa X de N.
-- Idempotente (UPSERT via ON CONFLICT).

BEGIN;

INSERT INTO email_templates (name, subject, html_content, text_content, variables, is_active)
VALUES (
  'lead-perdido-sla',
  'SLA expirado — lead redirecionado ({{codigo}})',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SLA expirado</title>
</head>
<body style="font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
  <div style="max-width: 700px; margin: 0 auto; background-color: white; padding: 0;">
    <div style="background: linear-gradient(135deg, #111827 0%, #991b1b 100%); padding: 26px; text-align: left; color: white;">
      <div style="font-size: 14px; opacity: 0.9;">Net Imobiliária</div>
      <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 800;">SLA expirado</h1>
      <div style="margin-top: 10px; font-size: 14px; opacity: 0.95;">O lead foi redirecionado para manter o timing do atendimento</div>
    </div>

    <div style="padding: 26px;">
      <p style="margin: 0 0 12px 0; color: #111827; font-size: 16px;"><strong>Olá, {{corretor_nome}}!</strong></p>
      <p style="margin: 0 0 18px 0; color: #374151; font-size: 15px; line-height: 1.6;">
        Você recebeu um lead, mas o prazo de aceite expirou. Para garantir rapidez ao cliente, o lead foi <strong>redirecionado</strong>.
      </p>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0;">
        <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 12px;">
          <div style="font-size: 11px; color: #9a3412; font-weight: 800; text-transform: uppercase; letter-spacing: .08em;">Tempo de SLA</div>
          <div style="margin-top: 6px; font-size: 18px; font-weight: 900; color: #9a3412;">{{sla_minutos}} min</div>
        </div>
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 12px;">
          <div style="font-size: 11px; color: #1d4ed8; font-weight: 800; text-transform: uppercase; letter-spacing: .08em;">Tentativa</div>
          <div style="margin-top: 6px; font-size: 18px; font-weight: 900; color: #1d4ed8;">{{tentativa_atual}} de {{limite_tentativas}}</div>
        </div>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <div style="font-size: 12px; color: #6b7280; font-weight: 700; text-transform: uppercase; letter-spacing: .08em;">Lead</div>
        <div style="margin-top: 8px; color: #111827; font-size: 16px; font-weight: 800;">{{titulo}}</div>
        <div style="margin-top: 6px; color: #374151; font-size: 14px;">Código: <strong>{{codigo}}</strong></div>
        <div style="margin-top: 6px; color: #374151; font-size: 14px;">{{cidade}} / {{estado}}</div>
      </div>

      <div style="text-align: center; margin: 22px 0;">
        <a href="{{painel_url}}"
           style="display: inline-block; background: #111827; color: white; text-decoration: none; padding: 12px 18px; border-radius: 12px; font-weight: 800;">
          Abrir painel
        </a>
      </div>

      <div style="border-top: 1px solid #e5e7eb; margin-top: 18px; padding-top: 14px; color: #6b7280; font-size: 12px;">
        <div>Dica: deixe o painel aberto e ative notificações para não perder novas oportunidades.</div>
      </div>
    </div>
  </div>
</body>
</html>',
  'SLA expirado — lead redirecionado ({{codigo}})

Olá, {{corretor_nome}}!

Você recebeu um lead, mas o prazo de aceite expirou. Para garantir rapidez ao cliente, o lead foi redirecionado.

Tempo de SLA: {{sla_minutos}} min
Tentativa: {{tentativa_atual}} de {{limite_tentativas}}

Lead:
- Código: {{codigo}}
- Título: {{titulo}}
- Cidade/UF: {{cidade}} / {{estado}}

Abrir painel: {{painel_url}}
',
  '["corretor_nome","codigo","titulo","cidade","estado","painel_url","sla_minutos","tentativa_atual","limite_tentativas"]'::jsonb,
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



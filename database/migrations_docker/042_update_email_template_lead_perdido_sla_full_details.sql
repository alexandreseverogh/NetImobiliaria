-- 042_update_email_template_lead_perdido_sla_full_details.sql
-- Atualiza template: lead-perdido-sla para incluir TODOS os detalhes do imóvel (pedagógico).
-- Alinha com docs/REGRAS_DE_NEGOCIO_TRANSBORDO_LEADS.md
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
  <div style="max-width: 760px; margin: 0 auto; background-color: white; padding: 0;">
    <div style="background: linear-gradient(135deg, #7f1d1d 0%, #ef4444 100%); padding: 26px; text-align: left; color: white;">
      <div style="font-size: 14px; opacity: 0.9;">Net Imobiliária</div>
      <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 800;">SLA expirado: Oportunidade perdida</h1>
      <div style="margin-top: 10px; font-size: 14px; opacity: 0.95;">O lead foi redirecionado para outro corretor devido à expiração do prazo</div>
    </div>

    <div style="padding: 26px;">
      <p style="margin: 0 0 12px 0; color: #111827; font-size: 16px;"><strong>Olá, {{corretor_nome}}!</strong></p>
      <p style="margin: 0 0 18px 0; color: #374151; font-size: 15px; line-height: 1.6;">
        O prazo de aceite para este lead expirou e ele foi encaminhado para o próximo corretor da fila para garantir o atendimento rápido ao cliente.
      </p>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 16px 0;">
        <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 12px;">
          <div style="font-size: 11px; color: #9a3412; font-weight: 800; text-transform: uppercase; letter-spacing: .08em;">Tempo Limite (SLA)</div>
          <div style="margin-top: 6px; font-size: 18px; font-weight: 900; color: #9a3412;">{{sla_minutos}} min</div>
        </div>
        <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 12px;">
          <div style="font-size: 11px; color: #1d4ed8; font-weight: 800; text-transform: uppercase; letter-spacing: .08em;">Tentativa Global</div>
          <div style="margin-top: 6px; font-size: 18px; font-weight: 900; color: #1d4ed8;">{{tentativa_atual}} de {{limite_tentativas}}</div>
        </div>
      </div>

      <div style="border-top: 1px solid #e5e7eb; margin: 24px 0;"></div>

      <p style="font-size: 14px; color: #6b7280; font-weight: 700; text-transform: uppercase; margin-bottom: 12px;">Detalhes da oportunidade perdida:</p>

      <!-- BLOCO 1: IMÓVEL (Completo igual ao Novo Lead) -->
      <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 16px 0; opacity: 0.8;">
        <div style="font-size: 12px; color: #6b7280; font-weight: 800; text-transform: uppercase; letter-spacing: .08em;">Imóvel</div>
        <div style="margin-top: 10px; color: #111827; font-size: 16px; font-weight: 800;">{{titulo}}</div>
        <div style="margin-top: 6px; color: #374151; font-size: 14px;">Código: <strong>{{codigo}}</strong></div>
        <div style="margin-top: 6px; color: #374151; font-size: 14px;">Finalidade: <strong>{{finalidade}}</strong> · Tipo: <strong>{{tipo}}</strong> · Status: <strong>{{status}}</strong></div>
        <div style="margin-top: 10px; color: #111827; font-size: 18px; font-weight: 900;">{{preco}}</div>

        <div style="margin-top: 12px; font-size: 13px; color: #111827; line-height: 1.5;">
          <div><strong>Descrição:</strong> {{descricao}}</div>
          <div style="margin-top: 8px;"><strong>Endereço:</strong> {{endereco_completo}}</div>
          <div style="margin-top: 6px;"><strong>Cidade/UF:</strong> {{cidade}} / {{estado}}</div>
          <div style="margin-top: 6px;"><strong>Condomínio:</strong> {{preco_condominio}} · <strong>IPTU:</strong> {{preco_iptu}} · <strong>Taxa extra:</strong> {{taxa_extra}}</div>
          <div style="margin-top: 6px;"><strong>Área total:</strong> {{area_total}} · <strong>Área construída:</strong> {{area_construida}}</div>
          <div style="margin-top: 6px;"><strong>Quartos:</strong> {{quartos}} · <strong>Banheiros:</strong> {{banheiros}} · <strong>Suítes:</strong> {{suites}}</div>
          <div style="margin-top: 6px;"><strong>Vagas:</strong> {{vagas_garagem}} · <strong>Varanda:</strong> {{varanda}} · <strong>Andar:</strong> {{andar}} · <strong>Total de andares:</strong> {{total_andares}}</div>
          <div style="margin-top: 6px;"><strong>Aceita permuta:</strong> {{aceita_permuta}} · <strong>Aceita financiamento:</strong> {{aceita_financiamento}}</div>
        </div>
      </div>

      <div style="text-align: center; margin: 22px 0;">
        <a href="{{painel_url}}"
           style="display: inline-block; background: #374151; color: white; text-decoration: none; padding: 12px 18px; border-radius: 12px; font-weight: 800;">
          Acessar Painel
        </a>
      </div>

      <div style="border-top: 1px solid #e5e7eb; margin-top: 18px; padding-top: 14px; color: #6b7280; font-size: 12px;">
        <div>Dica: Mantenha as notificações ativas e fique atento ao painel para não perder os próximos leads. A velocidade de resposta é fundamental.</div>
      </div>
    </div>
  </div>
</body>
</html>',
  'SLA expirado — lead redirecionado ({{codigo}})

Olá, {{corretor_nome}}!

O prazo de aceite para este lead expirou e ele foi encaminhado para o próximo corretor.

Tempo Limite (SLA): {{sla_minutos}} min
Tentativa: {{tentativa_atual}} de {{limite_tentativas}}

OPORTUNIDADE PERDIDA:
- Título: {{titulo}}
- Código: {{codigo}}
- Finalidade: {{finalidade}}
- Tipo: {{tipo}}
- Preço: {{preco}}
- Cidade/UF: {{cidade}} / {{estado}}
- Endereço: {{endereco_completo}}
- Detalhes: {{quartos}} quartos, {{vagas_garagem}} vagas, Área: {{area_total}}

Acesse o painel: {{painel_url}}
',
  '["corretor_nome","codigo","titulo","descricao","tipo","finalidade","status","cidade","estado","preco","preco_condominio","preco_iptu","taxa_extra","area_total","area_construida","quartos","banheiros","suites","vagas_garagem","varanda","andar","total_andares","aceita_permuta","aceita_financiamento","endereco_completo","painel_url","sla_minutos","tentativa_atual","limite_tentativas"]'::jsonb,
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

-- 039_update_email_template_novo_lead_corretor_imovel_fk_blocks.sql
-- Atualiza template novo-lead-corretor-imovel-fk para incluir 3 blocos:
-- 1) Imóvel (infos do step 1 e 2 do cadastro)
-- 2) Proprietário
-- 3) Cliente (Tenho interesse)
-- IMPORTANTE: não pede aceite e não exibe botão de "aceitar lead" (isso é exclusivo do fluxo com SLA/transbordo).
-- Idempotente (UPSERT via ON CONFLICT).

BEGIN;

INSERT INTO email_templates (name, subject, html_content, text_content, variables, is_active)
VALUES (
  'novo-lead-corretor-imovel-fk',
  'Novo interesse em imóvel — {{codigo}}',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Novo interesse em imóvel</title>
</head>
<body style="font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
  <div style="max-width: 760px; margin: 0 auto; background-color: white; padding: 0;">
    <div style="background: linear-gradient(135deg, #0f172a 0%, #111827 100%); padding: 26px; text-align: left; color: white;">
      <div style="font-size: 14px; opacity: 0.9;">Net Imobiliária</div>
      <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 800;">Novo interesse em imóvel</h1>
      <div style="margin-top: 10px; font-size: 14px; opacity: 0.95;">Um cliente demonstrou interesse em um imóvel vinculado a você</div>
    </div>

    <div style="padding: 26px;">
      <p style="margin: 0 0 12px 0; color: #111827; font-size: 16px;"><strong>Olá, {{corretor_nome}}!</strong></p>
      <p style="margin: 0 0 18px 0; color: #374151; font-size: 15px; line-height: 1.6;">
        Um cliente demonstrou interesse em um imóvel que já está associado ao seu perfil. Acesse o painel para ver os detalhes e iniciar o atendimento.
      </p>

      <!-- BLOCO 1: IMÓVEL (Steps 1 e 2) -->
      <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <div style="font-size: 12px; color: #6b7280; font-weight: 800; text-transform: uppercase; letter-spacing: .08em;">Imóvel (Dados Gerais + Localização)</div>
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
          <div style="margin-top: 6px;"><strong>Mobiliado:</strong> {{mobiliado}} · <strong>Aceita permuta:</strong> {{aceita_permuta}} · <strong>Aceita financiamento:</strong> {{aceita_financiamento}}</div>
          <div style="margin-top: 6px;"><strong>Latitude/Longitude:</strong> {{latitude}} / {{longitude}}</div>
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

      <div style="text-align: center; margin: 22px 0;">
        <a href="{{painel_url}}"
           style="display: inline-block; background: #111827; color: white; text-decoration: none; padding: 12px 18px; border-radius: 12px; font-weight: 900;">
          Abrir painel
        </a>
      </div>

      <div style="border-top: 1px solid #e5e7eb; margin-top: 18px; padding-top: 14px; color: #6b7280; font-size: 12px;">
        <div>Este é um e-mail automático.</div>
      </div>
    </div>
  </div>
</body>
</html>',
  'Novo interesse em imóvel — {{codigo}}

Olá, {{corretor_nome}}!

Um cliente demonstrou interesse em um imóvel vinculado a você. Acesse o painel para ver os detalhes e iniciar o atendimento.

IMÓVEL (Dados Gerais + Localização)
- Título: {{titulo}}
- Código: {{codigo}}
- Finalidade: {{finalidade}}
- Tipo: {{tipo}}
- Status: {{status}}
- Preço: {{preco}}
- Condomínio: {{preco_condominio}}
- IPTU: {{preco_iptu}}
- Taxa extra: {{taxa_extra}}
- Área total: {{area_total}}
- Área construída: {{area_construida}}
- Quartos: {{quartos}}
- Banheiros: {{banheiros}}
- Suítes: {{suites}}
- Vagas: {{vagas_garagem}}
- Varanda: {{varanda}}
- Andar: {{andar}}
- Total de andares: {{total_andares}}
- Mobiliado: {{mobiliado}}
- Aceita permuta: {{aceita_permuta}}
- Aceita financiamento: {{aceita_financiamento}}
- Endereço: {{endereco_completo}}
- Cidade/UF: {{cidade}} / {{estado}}
- Latitude/Longitude: {{latitude}} / {{longitude}}
- Descrição: {{descricao}}

PROPRIETÁRIO
- Nome: {{proprietario_nome}}
- CPF: {{proprietario_cpf}}
- Telefone: {{proprietario_telefone}}
- E-mail: {{proprietario_email}}
- Endereço: {{proprietario_endereco_completo}}

CLIENTE (Tenho interesse)
- Nome: {{cliente_nome}}
- Telefone: {{cliente_telefone}}
- E-mail: {{cliente_email}}
- Data do interesse: {{data_interesse}}
- Preferência de contato: {{preferencia_contato}}
- Mensagem: {{mensagem}}

Abrir painel: {{painel_url}}
',
  '["corretor_nome","codigo","titulo","descricao","tipo","finalidade","status","cidade","estado","preco","preco_condominio","preco_iptu","taxa_extra","area_total","area_construida","quartos","banheiros","suites","vagas_garagem","varanda","andar","total_andares","mobiliado","aceita_permuta","aceita_financiamento","endereco_completo","latitude","longitude","proprietario_nome","proprietario_cpf","proprietario_telefone","proprietario_email","proprietario_endereco_completo","cliente_nome","cliente_telefone","cliente_email","data_interesse","preferencia_contato","mensagem","painel_url"]'::jsonb,
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



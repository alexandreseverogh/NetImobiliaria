-- Migration: 006 Adjust Email Content
-- 1. Broker Template (ID 12): Use {{instruction_msg}} for conditional text.
-- 2. Client Template: Add Net Imobiliaria branded header.

-- 1. UPDATE BROKER TEMPLATE
UPDATE email_templates
SET 
    html_content = '<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Novo lead atribuído</title>
</head>
<body style="font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
  <div style="max-width: 760px; margin: 0 auto; background-color: white; padding: 0;">
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e40af 100%); padding: 26px; text-align: left; color: white;">
      <div style="font-size: 14px; opacity: 0.9;">Net Imobiliária</div>
      <h1 style="margin: 8px 0 0 0; font-size: 22px; font-weight: 800;">Você recebeu um novo lead</h1>
    </div>

    <div style="padding: 26px;">
      <p style="margin: 0 0 12px 0; color: #111827; font-size: 16px;"><strong>Olá, {{corretor_nome}}!</strong></p>
      <p style="margin: 0 0 18px 0; color: #374151; font-size: 15px; line-height: 1.6;">
        Um cliente demonstrou interesse. {{instruction_msg}}
      </p>

      <!-- BLOCO 1: IMÓVEL (Steps 1 e 2) -->
      <div style="background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <div style="font-size: 12px; color: #6b7280; font-weight: 800; text-transform: uppercase; letter-spacing: .08em;">Imóvel</div>
        <div style="margin-top: 10px; color: #111827; font-size: 16px; font-weight: 800;">{{titulo}}</div>
        <div style="margin-top: 6px; color: #374151; font-size: 14px;">Código: <strong>{{codigo}}</strong></div>
        <div style="margin-top: 6px; color: #374151; font-size: 14px;">Finalidade: <strong>{{finalidade}}</strong> · Tipo: <strong>{{tipo}}</strong> · Status: <strong>{{status}}</strong></div>
        <div style="margin-top: 10px; color: #111827; font-size: 18px; font-weight: 900;">{{preco}}</div>

        <div style="margin-top: 12px; font-size: 13px; color: #111827; line-height: 1.5;">
          <div><strong>Descrição:</strong> {{descricao}}</div>
          <div style="margin-top: 8px;"><strong>Endereço:</strong> {{endereco_completo}}</div>
          <div style="margin-top: 6px;"><strong>Cidade/UF:</strong> {{cidade}} / {{estado}}</div>
          <div style="margin-top: 6px;"><strong>Detalhes:</strong> {{quartos}} quartos, {{banheiros}} banheiros, {{vagas_garagem}} vagas. área: {{area_total}}</div>
        </div>
      </div>

      <!-- BLOCO 2: PROPRIETÁRIO -->
      <div style="background: #fff7ed; border: 1px solid #fed7aa; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <div style="font-size: 12px; color: #9a3412; font-weight: 800; text-transform: uppercase; letter-spacing: .08em;">Proprietário</div>
        <div style="margin-top: 8px; color: #111827; font-size: 15px;"><strong>{{proprietario_nome}}</strong></div>
        <div style="margin-top: 6px; color: #111827; font-size: 13px;">Telefone: {{proprietario_telefone}}</div>
        <div style="margin-top: 6px; color: #111827; font-size: 13px;">E-mail: {{proprietario_email}}</div>
      </div>

      <!-- BLOCO 3: CLIENTE (Tenho interesse) -->
      <div style="background: #ecfeff; border: 1px solid #cffafe; border-radius: 12px; padding: 16px; margin: 16px 0;">
        <div style="font-size: 12px; color: #0f766e; font-weight: 800; text-transform: uppercase; letter-spacing: .08em;">Cliente (Tenho interesse)</div>
        <div style="margin-top: 8px; color: #0f172a; font-size: 15px;"><strong>{{cliente_nome}}</strong></div>
        <div style="margin-top: 6px; color: #0f172a; font-size: 14px;">{{cliente_telefone}}</div>
        <div style="margin-top: 6px; color: #0f172a; font-size: 14px;">{{cliente_email}}</div>
        <div style=\"margin-top: 10px; color: #0f172a; font-size: 13px;\">Data do interesse: <strong>{{data_interesse}}</strong></div>\r\n        <div style=\"margin-top: 8px; color: #0f172a; font-size: 13px;\">Preferência de contato: <strong>{{preferencia_contato}}</strong></div>\r\n        <div style=\"margin-top: 8px; color: #0f172a; font-size: 13px;\">Mensagem: <em style=\"white-space: pre-wrap;\">{{mensagem}}</em></div>\r\n      </div>
      
      <div style="text-align: center; margin: 22px 0;">
        <a href="{{painel_url}}"
           style="display: inline-block; background: #2563eb; color: white; text-decoration: none; padding: 12px 18px; border-radius: 12px; font-weight: 900;">
          Acessar Painel
        </a>
      </div>
    </div>
  </div>
</body>
</html>'
WHERE id = 12;

-- 2. UPDATE CLIENT NOTIFICATION TEMPLATE (With Dark Header)
UPDATE email_templates
SET 
    html_content = '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333; font-size: 14px; line-height: 1.5; }
        .container { max-width: 760px; margin: 0 auto; background-color: white; padding: 0; }
        
        /* HEADER (Dark Theme like System Email) */
        .header { background: linear-gradient(135deg, #0f172a 0%, #111827 100%); padding: 26px; text-align: left; color: white; }
        .header-brand { font-size: 14px; opacity: 0.9; }
        .header-title { margin: 8px 0 0 0; font-size: 22px; font-weight: 800; }
        
        .content { padding: 26px; }
        .section { margin-bottom: 25px; }
        .section-title { font-size: 12px; color: #6b7280; font-weight: 800; text-transform: uppercase; letter-spacing: .08em; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 15px; }
        .row { margin-bottom: 8px; }
        .label { font-weight: bold; color: #555; }
        
        .footer { border-top: 1px solid #ddd; padding-top: 20px; text-align: center; font-size: 12px; color: #777; margin-top: 30px; }
        
        /* Broker Highlights */
        .broker-box { background: #f0fff4; border: 1px solid #c6f6d5; padding: 20px; border-radius: 8px; display: flex; align-items: center; }
        .broker-photo { width: 70px; height: 70px; border-radius: 50%; object-fit: cover; margin-right: 20px; border: 2px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .broker-details h3 { margin: 0 0 5px 0; font-size: 18px; color: #2d3748; }
        .broker-contact { font-size: 14px; color: #4a5568; margin-bottom: 3px; }
    </style>
</head>
<body>
    <div class="container">
        <!-- HEADER -->
        <div class="header">
            <div class="header-brand">Net Imobiliária</div>
            <h1 class="header-title">Atendimento Iniciado</h1>
            <div style="margin-top: 10px; font-size: 14px; opacity: 0.95;">
                Olá, <strong>{{cliente_nome}}</strong>. Seguem os dados do seu atendimento.
            </div>
        </div>

        <div class="content">
            <!-- 1. Imóvel -->
            <div class="section">
                <div class="section-title">Imóvel</div>
                <div class="row"><span class="label">Imóvel:</span> {{imovel_titulo}}</div>
                <div class="row"><span class="label">Código:</span> {{imovel_codigo}}</div>
                <div class="row"><span class="label">Valor:</span> {{preco}}</div>
                <div class="row"><span class="label">Endereço:</span> {{endereco_completo}}</div>
                <div class="row"><span class="label">Cidade/UF:</span> {{cidade_estado}}</div>
                <div class="row"><span class="label">Detalhes:</span> Área: {{area_total}} · Quartos: {{quartos}} · Suítes: {{suites}} · Vagas: {{vagas_garagem}}</div>
            </div>

            <!-- 2. Proprietário -->
            <div class="section">
                <div class="section-title">Proprietário</div>
                <div class="row"><span class="label">Nome:</span> {{proprietario_nome}}</div>
                <div class="row"><span class="label">Telefone:</span> {{proprietario_telefone}}</div>
                <div class="row"><span class="label">E-mail:</span> {{proprietario_email}}</div>
                <div class="row"><span class="label">Endereço:</span> {{proprietario_endereco}}</div>
            </div>

            <!-- 3. Cliente (Confirmação) -->
            <div class="section">
                <div class="section-title">Seus Dados (Cliente)</div>
                <div class="row"><span class="label">Nome:</span> {{cliente_nome}}</div>
                <div class="row"><span class="label">Data do interesse:</span> {{data_interesse}}</div>
                <div class="row"><span class="label">Preferência:</span> {{preferencia_contato}}</div>
                <div class="row"><span class="label">Mensagem:</span> {{mensagem}}</div>
            </div>

            <!-- 4. Corretor Responsável -->
            <div class="section">
                <div class="section-title">Corretor Responsável</div>
                <div class="broker-box">
                    <img src="cid:broker_photo" alt="Foto" class="broker-photo" onerror="this.src=''https://ui-avatars.com/api/?name={{corretor_nome}}&background=random''">
                    <div class="broker-details">
                        <h3>{{corretor_nome}}</h3>
                        <div class="broker-contact">📞 {{corretor_telefone}}</div>
                        <div class="broker-contact">📧 {{corretor_email}}</div>
                        <div class="broker-contact">💳 CRECI: {{corretor_creci}}</div>
                    </div>
                </div>
            </div>

            <div class="footer">
                <p>Este e-mail foi enviado automaticamente pelo sistema NetImobiliária.</p>
                <p>&copy; {{year}}</p>
            </div>
        </div>
    </div>
</body>
</html>'
WHERE name = 'lead_accepted_client_notification';

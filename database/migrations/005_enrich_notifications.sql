-- Migration: Enrich Notifications (Broker Greeting & Detailed Client Email)

-- 1. UPDATE BROKER TEMPLATE HTML (Dynamic Greeting)
-- Assuming ID 12 is the broker template
UPDATE email_templates
SET 
    html_content = REPLACE(html_content, 'Olá, Plantonista', 'Olá, {{corretor_nome}}')
WHERE id = 12;

-- 2. UPDATE CLIENT NOTIFICATION TEMPLATE (Rich Content)
UPDATE email_templates
SET 
    variables = '["cliente_nome", "imovel_titulo", "imovel_codigo", "corretor_nome", "corretor_telefone", "corretor_email", "corretor_creci", "year", "preco", "endereco_completo", "cidade_estado", "area_total", "quartos", "suites", "vagas_garagem", "proprietario_nome", "proprietario_cpf", "proprietario_telefone", "proprietario_email", "proprietario_endereco", "data_interesse", "preferencia_contato", "mensagem"]'::jsonb,
    html_content = '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333; font-size: 14px; line-height: 1.5; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border: 1px solid #ddd; padding: 20px; }
        .header { border-bottom: 2px solid #276749; padding-bottom: 10px; margin-bottom: 20px; }
        .header h1 { margin: 0; color: #276749; font-size: 20px; }
        .section { margin-bottom: 25px; }
        .section-title { font-weight: bold; color: #276749; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px; font-size: 16px; }
        .row { margin-bottom: 5px; }
        .label { font-weight: bold; color: #555; }
        .footer { border-top: 1px solid #ddd; padding-top: 20px; text-align: center; font-size: 12px; color: #777; margin-top: 30px; }
        
        /* Broker Highlights */
        .broker-box { background: #f0fff4; border: 1px solid #c6f6d5; padding: 15px; border-radius: 5px; display: flex; align-items: center; }
        .broker-photo { width: 70px; height: 70px; border-radius: 50%; object-fit: cover; margin-right: 15px; border: 2px solid #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .broker-details h3 { margin: 0 0 5px 0; font-size: 16px; color: #2d3748; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Atendimento Iniciado</h1>
            <p>Olá, <strong>{{cliente_nome}}</strong>. Seguem os dados completos do seu atendimento.</p>
        </div>

        <!-- 1. Imóvel -->
        <div class="section">
            <div class="section-title">Imóvel</div>
            <div class="row"><span class="label">Código:</span> {{imovel_codigo}}</div>
            <div class="row"><span class="label">Imóvel:</span> {{imovel_titulo}}</div>
            <div class="row"><span class="label">Valor:</span> {{preco}}</div>
            <div class="row"><span class="label">Endereço:</span> {{endereco_completo}}</div>
            <div class="row"><span class="label">Cidade/UF:</span> {{cidade_estado}}</div>
            <div class="row"><span class="label">Detalhes:</span> Área: {{area_total}} · Quartos: {{quartos}} · Suítes: {{suites}} · Vagas: {{vagas_garagem}}</div>
        </div>

        <!-- 2. Proprietário -->
        <div class="section">
            <div class="section-title">Proprietário</div>
            <div class="row"><span class="label">Nome:</span> {{proprietario_nome}}</div>
            <!-- CPF ocultado por segurança padrão, mas disponível se template quiser -->
            <!-- <div class="row"><span class="label">CPF:</span> {{proprietario_cpf}}</div> -->
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
                    <div style="font-size: 13px;">
                        <div>📞 {{corretor_telefone}}</div>
                        <div>📧 {{corretor_email}}</div>
                        <div>💳 CRECI: {{corretor_creci}}</div>
                    </div>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>Este e-mail foi enviado automaticamente pelo sistema NetImobiliária.</p>
            <p>&copy; {{year}}</p>
        </div>
    </div>
</body>
</html>'
WHERE name = 'lead_accepted_client_notification';

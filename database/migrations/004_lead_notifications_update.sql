-- Migration: Update Broker Notification & Add Client Notification
-- Description: 
-- 1. Updates Template 12 (Broker) to use dynamic acceptance message in subject.
-- 2. Creates Template for notifying Clients when a broker is assigned.

-- 1. UPDATE BROKER TEMPLATE SUBJECT
UPDATE email_templates
SET 
    subject = 'Novo lead para você {{aceite_msg}} - {{codigo}}'
WHERE id = 12;

-- 2. INSERT CLIENT NOTIFICATION TEMPLATE
INSERT INTO email_templates (name, subject, html_content, text_content, variables, is_active)
VALUES (
    'lead_accepted_client_notification',
    'Seu interesse no imóvel - {{imovel_codigo}}',
    '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
    <style>
        body { font-family: "Roboto", sans-serif; margin: 0; padding: 0; background-color: #f4f4f4; color: #333; }
        .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background-color: #276749; color: #ffffff; padding: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
        .content { padding: 30px; }
        .section { margin-bottom: 25px; padding-bottom: 25px; border-bottom: 1px solid #eee; }
        .section:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
        .section-title { font-size: 18px; color: #276749; font-weight: 600; margin-bottom: 15px; border-left: 4px solid #48bb78; padding-left: 10px; }
        
        /* Broker Card */
        .broker-card { display: flex; align-items: center; background: #f0fff4; padding: 15px; border-radius: 8px; border: 1px solid #c6f6d5; }
        .broker-photo { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-right: 20px; }
        .broker-info h3 { margin: 0 0 5px 0; font-size: 18px; color: #2d3748; }
        .broker-detail { font-size: 14px; color: #718096; margin: 2px 0; display: flex; align-items: center; }
        
        /* Property Card */
        .property-card { background: #fff; padding: 15px; border: 1px solid #e2e8f0; border-radius: 8px; }
        .property-title { font-weight: 700; color: #2d3748; margin-bottom: 5px; }
        .property-code { font-size: 13px; color: #718096; background: #edf2f7; padding: 2px 8px; border-radius: 4px; display: inline-block; }
        
        .footer { background-color: #f7fafc; padding: 20px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Atendimento Iniciado</h1>
        </div>
        <div class="content">
            <p>Olá, <strong>{{cliente_nome}}</strong>!</p>
            <p>Recebemos seu interesse no imóvel. Um de nossos corretores especialistas já foi designado para lhe atender.</p>

            <!-- Dados do Imóvel -->
            <div class="section">
                <div class="section-title">Imóvel de Interesse</div>
                <div class="property-card">
                    <div class="property-title">{{imovel_titulo}}</div>
                    <div class="property-code">Cód: {{imovel_codigo}}</div>
                </div>
            </div>

            <!-- Dados do Corretor -->
            <div class="section">
                <div class="section-title">Seu Corretor</div>
                <div class="broker-card">
                    <img src="cid:broker_photo" alt="Foto do Corretor" class="broker-photo" onerror="this.src=''https://ui-avatars.com/api/?name={{corretor_nome}}&background=random''">
                    <div class="broker-info">
                        <h3>{{corretor_nome}}</h3>
                        <div class="broker-detail">📞 {{corretor_telefone}}</div>
                        <div class="broker-detail">📧 {{corretor_email}}</div>
                        <div class="broker-detail">💳 CRECI: {{corretor_creci}}</div>
                    </div>
                </div>
            </div>

            <p style="text-align: center; margin-top: 30px; font-size: 14px; color: #718096;">
                O corretor entrará em contato em breve através do telefone ou e-mail que você informou.
            </p>
        </div>
        <div class="footer">
            <p>&copy; {{year}} NetImobiliária. Todos os direitos reservados.</p>
        </div>
    </div>
</body>
</html>',
    'Olá {{cliente_nome}}, o corretor {{corretor_nome}} irá atende-lo ref ao imóvel {{imovel_codigo}}. Contato: {{corretor_telefone}}.',
    '["cliente_nome", "imovel_titulo", "imovel_codigo", "corretor_nome", "corretor_telefone", "corretor_email", "corretor_creci", "year"]'::jsonb,
    true
)
ON CONFLICT (name) 
DO UPDATE SET 
    html_content = EXCLUDED.html_content,
    text_content = EXCLUDED.text_content,
    variables = EXCLUDED.variables;

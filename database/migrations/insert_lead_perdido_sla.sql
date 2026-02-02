-- Migration: Insert missing 'lead-perdido-sla' template
-- Created because 'Lead Expirado' emails are failing due to missing template.

INSERT INTO public.email_templates (name, subject, html_content, text_content, is_active, created_at, updated_at)
VALUES (
    'lead-perdido-sla',
    '⏳ Lead Expirado - Imóvel {{codigo}}',
    '<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px; }
        .header { background-color: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px 5px 0 0; text-align: center; }
        .content { padding: 20px; }
        .footer { text-align: center; font-size: 12px; color: #888; margin-top: 20px; }
        .button { display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2>Lead Expirado</h2>
        </div>
        <div class="content">
            <p>Olá <strong>{{corretor_nome}}</strong>,</p>
            
            <p>O tempo de SLA para aceite do lead do imóvel <strong>{{titulo}}</strong> ({{codigo}}) expirou.</p>
            
            <p style="background-color: #eee; padding: 10px; border-radius: 5px; text-align: center;">
                <strong>SLA: {{sla_minutos}} min</strong>
            </p>
            
            <p>O lead foi redistribuído automaticamente para outro corretor para garantir o atendimento rápido ao cliente.</p>
            
            <p>Fique atento ao painel para não perder novas oportunidades!</p>
            
            <div style="text-align: center;">
                <a href="{{painel_url}}" class="button" style="color: white;">Acessar Painel</a>
            </div>
        </div>
        <div class="footer">
            <p>Este é um email automático, por favor não responda.</p>
            <p>&copy; 2026 Net Imobiliária</p>
        </div>
    </div>
</body>
</html>',
    'Olá {{corretor_nome}},\n\nO tempo de SLA para aceite do lead do imóvel {{titulo}} ({{codigo}}) expirou.\n\nSLA: {{sla_minutos}} min\n\nO lead foi redistribuído automaticamente para outro corretor.\n\nAcesse seu painel para mais informações: {{painel_url}}',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (name) DO UPDATE SET
    subject = EXCLUDED.subject,
    html_content = EXCLUDED.html_content,
    text_content = EXCLUDED.text_content,
    is_active = true,
    updated_at = NOW();

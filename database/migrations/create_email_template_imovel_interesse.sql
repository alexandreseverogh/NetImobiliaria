-- Script: Criar template de email para notificação de interesse em imóvel
-- Data: 2025-01-XX
-- Descrição: Template para enviar e-mail quando um cliente demonstra interesse em um imóvel

BEGIN;

-- Inserir template de email (ou atualizar se já existir)
INSERT INTO email_templates (name, subject, html_content, text_content, variables, is_active)
VALUES (
  'imovel-interesse',
  'Novo Interesse em Imóvel - {{codigo}}',
  '<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Novo Interesse em Imóvel</title>
</head>
<body style="font-family: ''Segoe UI'', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
    <div style="max-width: 700px; margin: 0 auto; background-color: white; padding: 0;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold;">🏠 Net Imobiliária</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Novo Interesse em Imóvel</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
            <p style="font-size: 16px; color: #374151; margin: 0 0 20px 0;">Olá,</p>
            <p style="font-size: 16px; color: #374151; margin: 0 0 30px 0;">Um cliente demonstrou interesse em um imóvel cadastrado no sistema.</p>

            <!-- Informações do Imóvel -->
            <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); border-left: 4px solid #2563eb; padding: 25px; margin: 20px 0; border-radius: 8px;">
                <h2 style="margin: 0 0 20px 0; color: #1e40af; font-size: 22px; font-weight: bold;">📋 Informações do Imóvel</h2>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px; font-weight: 600; text-transform: uppercase;">📍 Estado</div>
                        <div style="font-size: 16px; color: #1f2937; font-weight: 600;">{{estado}}</div>
                    </div>
                    <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px; font-weight: 600; text-transform: uppercase;">🏙️ Cidade</div>
                        <div style="font-size: 16px; color: #1f2937; font-weight: 600;">{{cidade}}</div>
                    </div>
                </div>

                <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; margin-bottom: 15px;">
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px; font-weight: 600; text-transform: uppercase;">📍 Endereço Completo</div>
                    <div style="font-size: 15px; color: #1f2937; line-height: 1.6;">{{endereco_completo}}</div>
                </div>

                <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb; margin-bottom: 15px;">
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px; font-weight: 600; text-transform: uppercase;">🎯 Finalidade</div>
                    <div style="font-size: 16px; color: #1f2937; font-weight: 600;">{{finalidade}}</div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px; font-weight: 600; text-transform: uppercase;">💰 Preço</div>
                        <div style="font-size: 18px; color: #059669; font-weight: bold;">{{preco}}</div>
                    </div>
                    <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px; font-weight: 600; text-transform: uppercase;">🏢 Condomínio</div>
                        <div style="font-size: 16px; color: #1f2937; font-weight: 600;">{{condominio}}</div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px; font-weight: 600; text-transform: uppercase;">📄 IPTU</div>
                        <div style="font-size: 16px; color: #1f2937; font-weight: 600;">{{iptu}}</div>
                    </div>
                    <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px; font-weight: 600; text-transform: uppercase;">💵 Taxa Extra</div>
                        <div style="font-size: 16px; color: #1f2937; font-weight: 600;">{{taxa_extra}}</div>
                    </div>
                </div>

                <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb; margin-bottom: 15px;">
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px; font-weight: 600; text-transform: uppercase;">📐 Área Total</div>
                    <div style="font-size: 16px; color: #1f2937; font-weight: 600;">{{area_total}}</div>
                </div>

                <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; margin-bottom: 15px;">
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px; font-weight: 600; text-transform: uppercase;">🏠 Características do Imóvel</div>
                    <div style="font-size: 15px; color: #1f2937; line-height: 1.8;">
                        🛏️ <strong>Quartos:</strong> {{quartos}} | 
                        🚿 <strong>Suítes:</strong> {{suites}} | 
                        🚽 <strong>Banheiros:</strong> {{banheiros}} | 
                        🚗 <strong>Garagens:</strong> {{garagens}} | 
                        🌳 <strong>Varanda:</strong> {{varanda}} | 
                        🏢 <strong>Andar:</strong> {{andar}} | 
                        🏗️ <strong>Total Andares:</strong> {{total_andares}}
                    </div>
                </div>
            </div>

            <!-- Informações do Cliente -->
            <div style="background: #f9fafb; border-left: 4px solid #10b981; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3 style="margin: 0 0 15px 0; color: #059669; font-size: 18px; font-weight: bold;">👤 Informações do Cliente</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px; font-weight: 600;">Nome</div>
                        <div style="font-size: 15px; color: #1f2937; font-weight: 600;">{{cliente_nome}}</div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px; font-weight: 600;">Email</div>
                        <div style="font-size: 15px; color: #1f2937;">{{cliente_email}}</div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px; font-weight: 600;">Telefone</div>
                        <div style="font-size: 15px; color: #1f2937;">{{cliente_telefone}}</div>
                    </div>
                    <div>
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px; font-weight: 600;">Data de Interesse</div>
                        <div style="font-size: 15px; color: #1f2937; font-weight: 600;">{{data_interesse}}</div>
                    </div>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
                    <div>
                        <div style="font-size: 12px; color: #6b7280; margin-bottom: 5px; font-weight: 600;">📞 Preferência de Contato</div>
                        <div style="font-size: 15px; color: #1f2937; font-weight: 600;">{{preferencia_contato}}</div>
                    </div>
                </div>
                <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; margin-top: 10px;">
                    <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px; font-weight: 600; text-transform: uppercase;">💬 Mensagem do Cliente</div>
                    <div style="font-size: 15px; color: #1f2937; line-height: 1.6; font-style: italic; white-space: pre-wrap;">{{mensagem}}</div>
                </div>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
                <p style="margin: 0;">© 2024 Net Imobiliária - Todos os direitos reservados</p>
                <p style="margin: 5px 0 0 0;">Este é um e-mail automático, por favor não responda.</p>
            </div>
        </div>
    </div>
</body>
</html>',
  'Novo Interesse em Imóvel - {{codigo}}

Informações do Imóvel:
- Estado: {{estado}}
- Cidade: {{cidade}}
- Finalidade: {{finalidade}}
- Preço: {{preco}}
- Condomínio: {{condominio}}
- IPTU: {{iptu}}
- Taxa Extra: {{taxa_extra}}
- Área Total: {{area_total}}
- Quartos: {{quartos}}
- Suítes: {{suites}}
- Banheiros: {{banheiros}}
- Garagens: {{garagens}}
- Varanda: {{varanda}}
- Andar: {{andar}}
- Total Andares: {{total_andares}}
- Endereço: {{endereco_completo}}

Características: Quartos: {{quartos}} | Suítes: {{suites}} | Banheiros: {{banheiros}} | Garagens: {{garagens}} | Varanda: {{varanda}} | Andar: {{andar}} | Total Andares: {{total_andares}}

Informações do Cliente:
- Nome: {{cliente_nome}}
- Email: {{cliente_email}}
- Telefone: {{cliente_telefone}}
- Preferência de Contato: {{preferencia_contato}}
- Mensagem: {{mensagem}}
- Data de Interesse: {{data_interesse}}

© 2024 Net Imobiliária',
  '["codigo", "estado", "cidade", "finalidade", "preco", "condominio", "iptu", "taxa_extra", "area_total", "quartos", "suites", "banheiros", "garagens", "varanda", "andar", "total_andares", "endereco_completo", "cliente_nome", "cliente_email", "cliente_telefone", "data_interesse", "preferencia_contato", "mensagem"]'::jsonb,
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

-- Verificação
SELECT 'Template de email imovel-interesse criado/atualizado com sucesso!' AS status;


import { NextRequest, NextResponse } from 'next/server'
import { pool } from '@/lib/database/connection'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { nome, telefone, email, mensagem } = await request.json()

    // Validação
    if (!nome || !telefone || !email || !mensagem) {
      return NextResponse.json(
        { success: false, error: 'Todos os campos são obrigatórios' },
        { status: 400 }
      )
    }

    console.log(`[API Contato] Recebendo mensagem de: ${nome} (${email})`);

    // Importar serviço de e-mail (Lazy load para evitar circular dependencies se houver)
    const { default: emailService } = await import('@/services/emailService');

    // Definir destinatário (Fallback seguro)
    // Idealmente, isso viria de uma variável de ambiente ou parâmetro de sistema validado.
    // Vou manter o padrão que vi no código anterior como fallback.
    const emailDestino = process.env.EMAIL_CONTACT_DESTINATION || 'alexandreseverog@gmail.com';

    // Construir corpo do e-mail
    const subject = `Novo Contato do Site - ${nome}`;
    const htmlBody = `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <div style="background: linear-gradient(135deg, #0f172a 0%, #111827 100%); padding: 15px; margin: -20px -20px 20px -20px; border-radius: 8px 8px 0 0; color: white;">
                    <h2 style="margin: 0; font-size: 18px;">Novo Contato Recebido</h2>
                </div>
                
                <div style="margin: 20px 0;">
                  <p style="margin: 10px 0;"><strong>Nome:</strong> ${nome}</p>
                  <p style="margin: 10px 0;"><strong>Telefone:</strong> ${telefone}</p>
                  <p style="margin: 10px 0;"><strong>E-mail:</strong> <a href="mailto:${email}">${email}</a></p>
                </div>
                
                <div style="margin: 20px 0; padding: 15px; background-color: #f3f4f6; border-left: 4px solid #2563eb; border-radius: 4px;">
                  <p style="margin: 0 0 10px 0;"><strong>Mensagem:</strong></p>
                  <p style="margin: 0; white-space: pre-wrap;">${mensagem}</p>
                </div>
                
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
                  <p>Esta mensagem foi enviada através do formulário de contato do site.</p>
                </div>
              </div>
            </body>
          </html>
        `;

    // Enviar
    await emailService.sendSimpleEmail(emailDestino, subject, htmlBody);

    console.log(`[API Contato] E-mail enviado com sucesso para ${emailDestino}`);

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('❌ [API Contato] Erro ao enviar e-mail:', error)
    return NextResponse.json(
      { success: false, error: 'Erro ao enviar mensagem' },
      { status: 500 }
    )
  }
}

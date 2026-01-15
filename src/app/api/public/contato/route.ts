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

        // Buscar configurações de e-mail
        const client = await pool.connect()
        try {
            // Buscar e-mail de destino (mesmo usado para "Tenho Interesse")
            const settingsResult = await client.query(`
        SELECT valor 
        FROM parametros_sistema 
        WHERE chave = 'email_notificacao_leads'
      `)

            const emailDestino = settingsResult.rows[0]?.valor || 'contato@netimobiliaria.com.br'

            // Buscar configurações SMTP
            const smtpResult = await client.query('SELECT * FROM email_settings LIMIT 1')
            const smtpConfig = smtpResult.rows[0]

            if (!smtpConfig) {
                throw new Error('Configurações de e-mail não encontradas')
            }

            // Criar transporter do nodemailer
            const nodemailer = require('nodemailer')
            const transporter = nodemailer.createTransport({
                host: smtpConfig.smtp_host,
                port: smtpConfig.smtp_port,
                secure: smtpConfig.smtp_secure,
                auth: {
                    user: smtpConfig.smtp_user,
                    pass: smtpConfig.smtp_password
                }
            })

            // Enviar e-mail
            await transporter.sendMail({
                from: `"${smtpConfig.from_name}" <${smtpConfig.from_email}>`,
                to: emailDestino,
                subject: `Novo Contato do Site - ${nome}`,
                html: `
          <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px;">Novo Contato Recebido</h2>
                
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
        `
            })

            return NextResponse.json({ success: true })
        } finally {
            client.release()
        }
    } catch (error: any) {
        console.error('❌ [API Contato] Erro ao enviar e-mail:', error)
        return NextResponse.json(
            { success: false, error: 'Erro ao enviar mensagem' },
            { status: 500 }
        )
    }
}

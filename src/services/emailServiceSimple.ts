import nodemailer from 'nodemailer';

// EmailService simplificado - sem inicialização complexa
class EmailServiceSimple {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Configuração hardcoded para Gmail - sem dependência do banco
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true para 465, false para outras portas
      auth: {
        user: 'alexandreseverog@gmail.com',
        pass: 'ewaz aohi aznk megn' // Senha de app do Gmail
      }
    });
  }

  async send2FACode(to: string, code: string): Promise<boolean> {
    if (!this.transporter) {
      console.error('❌ Transporter não inicializado');
      return false;
    }

    try {
      const mailOptions = {
        from: 'alexandreseverog@gmail.com',
        to: to,
        subject: 'Código de Verificação - Imovitec',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Código de Verificação</title>
          </head>
          <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f4f4f4;">
            <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 10px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2563eb;">🏠 Imovtec</h1>
                <h2>Código de Verificação</h2>
              </div>
              
              <p>Olá!</p>
              <p>Você solicitou um código de verificação para acessar sua conta.</p>
              
              <div style="background-color: #f3f4f6; border: 2px solid #d1d5db; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                <p style="margin: 0; color: #6b7280;">Seu código de verificação é:</p>
                <div style="font-size: 32px; font-weight: bold; color: #1f2937; letter-spacing: 5px; margin-top: 10px;">${code}</div>
              </div>
              
              <div style="background-color: #fef3c7; border: 1px solid #f59e0b; border-radius: 5px; padding: 15px; margin: 20px 0; color: #92400e;">
                <strong>⚠️ Importante:</strong>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Este código expira em <strong>10 minutos</strong></li>
                  <li>Não compartilhe este código com ninguém</li>
                </ul>
              </div>
              
              <p>Se você não solicitou este código, ignore este email.</p>
              
              <div style="text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px;">
                <p>© 2024 Imovtec</p>
              </div>
            </div>
          </body>
          </html>
        `
      };

      await this.transporter.sendMail(mailOptions);
      console.log('✅ Email 2FA enviado com sucesso para:', to);
      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar email 2FA:', error);
      return false;
    }
  }
}

// Instância singleton
const emailServiceSimple = new EmailServiceSimple();
export default emailServiceSimple;



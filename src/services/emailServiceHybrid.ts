import nodemailer from 'nodemailer';
import { Pool } from 'pg';

// Configuração do pool de conexão com PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME!,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Roberto@2007',
});

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  fromName: string;
}

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  html_content: string;
  text_content: string;
  variables: string[];
}

class EmailServiceHybrid {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;
  private templates: Map<string, EmailTemplate> = new Map();
  private isDynamicInitialized = false;

  /**
   * Inicialização híbrida: tenta dinâmico, se falhar usa hardcoded
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔄 Tentando inicialização dinâmica...');
      await this.loadEmailConfig();
      await this.loadEmailTemplates();
      await this.createTransporter();
      this.isDynamicInitialized = true;
      console.log('✅ EmailService inicializado dinamicamente');
    } catch (error) {
      console.log('⚠️ Falha na inicialização dinâmica, usando fallback hardcoded...');
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log('❌ Erro:', errorMessage);
      this.useHardcodedConfig();
      console.log('✅ EmailService inicializado com fallback hardcoded');
    }
  }

  /**
   * Configuração hardcoded como fallback
   */
  private useHardcodedConfig(): void {
    this.config = {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'alexandreseverog@gmail.com',
        pass: 'ewaz aohi aznk megn'
      },
      from: 'alexandreseverog@gmail.com',
      fromName: 'Imovtec'
    };

    // Template hardcoded para 2FA
    this.templates.set('2fa-code', {
      id: 0,
      name: '2fa-code',
      subject: 'Código de Verificação - Imovitec',
      html_content: `<!DOCTYPE html>
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
      <div style="font-size: 32px; font-weight: bold; color: #1f2937; letter-spacing: 5px; margin-top: 10px;">{{code}}</div>
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
</html>`,
      text_content: '',
      variables: ['code']
    });

    this.createTransporter();
  }

  /**
   * Carrega configurações de email do banco de dados
   */
  private async loadEmailConfig(): Promise<void> {
    const query = 'SELECT * FROM email_settings WHERE is_active = true LIMIT 1';
    const result = await pool.query(query);

    if (result.rows.length === 0) {
      throw new Error('Nenhuma configuração de email ativa encontrada');
    }

    const settings = result.rows[0];

    if (!settings.smtp_username || !settings.smtp_password) {
      throw new Error('Credenciais SMTP não configuradas');
    }

    this.config = {
      host: settings.smtp_host,
      port: settings.smtp_port,
      secure: settings.smtp_secure,
      auth: {
        user: settings.smtp_username,
        pass: settings.smtp_password
      },
      from: settings.from_email,
      fromName: settings.from_name
    };
  }

  /**
   * Carrega templates de email do banco de dados
   */
  private async loadEmailTemplates(): Promise<void> {
    const query = 'SELECT * FROM email_templates WHERE is_active = true';
    const result = await pool.query(query);

    result.rows.forEach(template => {
      this.templates.set(template.name, {
        id: template.id,
        name: template.name,
        subject: template.subject,
        html_content: template.html_content,
        text_content: template.text_content || '',
        variables: template.variables || []
      });
    });
  }

  /**
   * Cria o transporter nodemailer
   */
  private createTransporter(): void {
    if (!this.config) {
      throw new Error('Configuração de email não carregada');
    }

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth: this.config.auth
    });
  }

  /**
   * Envia email usando template
   */
  async sendTemplateEmail(templateName: string, to: string, variables: Record<string, string>): Promise<boolean> {
    if (!this.transporter) {
      console.error('❌ Transporter não inicializado');
      return false;
    }

    const template = this.templates.get(templateName);
    if (!template) {
      console.error(`❌ Template '${templateName}' não encontrado`);
      return false;
    }

    try {
      // Substituir variáveis no HTML
      let htmlContent = template.html_content;
      Object.entries(variables).forEach(([key, value]) => {
        htmlContent = htmlContent.replace(new RegExp(`{{${key}}}`, 'g'), value);
      });

      const mailOptions = {
        from: `"${this.config!.fromName}" <${this.config!.from}>`,
        to: to,
        subject: template.subject,
        html: htmlContent
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email enviado com sucesso:', info.messageId);

      // Log no banco se estiver usando sistema dinâmico
      if (this.isDynamicInitialized) {
        await this.logEmailSend(templateName, to, 'success', info.messageId);
      }

      return true;
    } catch (error) {
      console.error('❌ Erro ao enviar email:', error);

      // Log no banco se estiver usando sistema dinâmico
      if (this.isDynamicInitialized) {
        await this.logEmailSend(templateName, to, 'error', null, error);
      }

      return false;
    }
  }

  /**
   * Registra envio de email no banco (apenas se dinâmico)
   */
  private async logEmailSend(
    templateName: string,
    to: string,
    status: 'success' | 'error',
    messageId: string | null = null,
    error: any = null
  ): Promise<void> {
    if (!this.isDynamicInitialized) return; // Não logar se usando fallback

    try {
      const query = `
        INSERT INTO email_logs (template_name, recipient_email, status, message_id, error_message, sent_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `;

      await pool.query(query, [
        templateName,
        to,
        status,
        messageId,
        error ? error.message : null
      ]);
    } catch (logError) {
      console.error('❌ Erro ao registrar log de email:', logError);
    }
  }

  /**
   * Envia código 2FA
   */
  async send2FACode(email: string, code: string): Promise<boolean> {
    return await this.sendTemplateEmail('2fa-code', email, { code });
  }

  /**
   * Gera código de verificação
   */
  generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

// Instância singleton com inicialização automática
const emailServiceHybrid = new EmailServiceHybrid();

// Inicialização automática
let initializationPromise: Promise<void> | null = null;

async function ensureInitialized(): Promise<void> {
  if (!initializationPromise) {
    initializationPromise = emailServiceHybrid.initialize();
  }
  return initializationPromise;
}

/**
 * Wrapper do EmailServiceHybrid
 */
const emailService = {
  async sendTemplateEmail(to: string, templateName: string, variables: Record<string, string>): Promise<boolean> {
    await ensureInitialized();
    return emailServiceHybrid.sendTemplateEmail(templateName, to, variables);
  },

  async send2FACode(email: string, code: string): Promise<boolean> {
    await ensureInitialized();
    return emailServiceHybrid.send2FACode(email, code);
  },

  generateVerificationCode(): string {
    return emailServiceHybrid.generateVerificationCode();
  }
};

export default emailService;



import nodemailer from 'nodemailer'
import type { Attachment } from 'nodemailer/lib/mailer'
import { Pool } from 'pg';

// Configuração do pool de conexão com PostgreSQL
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'net_imobiliaria',
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

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig | null = null;
  private templates: Map<string, EmailTemplate> = new Map();

  /**
   * Inicializa o serviço de email carregando configurações do banco
   */
  async initialize(): Promise<void> {
    try {
      // Carregar configurações de email do banco
      await this.loadEmailConfig();
      
      // Carregar templates de email
      await this.loadEmailTemplates();
      
      console.log('✅ EmailService inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar EmailService:', error);
      throw error;
    }
  }

  /**
   * Carrega configurações de email do banco de dados
   */
  private async loadEmailConfig(): Promise<void> {
    const query = 'SELECT * FROM email_settings WHERE is_active = true LIMIT 1';
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      throw new Error('Nenhuma configuração de email ativa encontrada no banco');
    }

    const settings = result.rows[0];
    
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

    // Criar transporter
    this.transporter = nodemailer.createTransport(this.config);
    
    // Verificar conexão
    await this.transporter.verify();
    console.log('✅ Conexão SMTP verificada com sucesso');
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
        text_content: template.text_content,
        variables: template.variables || []
      });
    });

    console.log(`✅ ${this.templates.size} templates de email carregados`);
  }

  /**
   * Envia email usando template
   */
  async sendTemplateEmail(
    templateName: string,
    to: string,
    variables: Record<string, string> = {},
    attachments?: Attachment[]
  ): Promise<boolean> {
    if (!this.transporter) {
      throw new Error('EmailService não foi inicializado');
    }

    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' não encontrado`);
    }

    // Substituir variáveis no subject e content
    let subject = template.subject || '';
    let htmlContent = template.html_content || '';
    let textContent = template.text_content || '';

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      htmlContent = htmlContent.replace(new RegExp(placeholder, 'g'), value);
      textContent = textContent.replace(new RegExp(placeholder, 'g'), value);
    });

    const mailOptions = {
      from: `"${this.config!.fromName}" <${this.config!.from}>`,
      to,
      subject,
      html: htmlContent,
      text: textContent,
      attachments
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      
      // Log do envio
      await this.logEmailSend(templateName, to, 'success', info.messageId);
      
      console.log(`✅ Email enviado com sucesso: ${info.messageId}`);
      return true;
    } catch (error) {
      await this.logEmailSend(templateName, to, 'error', null, error);
      console.error('❌ Erro ao enviar email:', error);
      return false;
    }
  }

  /**
   * Envia email simples sem template
   */
  async sendSimpleEmail(
    to: string,
    subject: string,
    htmlContent: string,
    textContent?: string
  ): Promise<boolean> {
    if (!this.transporter) {
      throw new Error('EmailService não foi inicializado');
    }

    const mailOptions = {
      from: `"${this.config!.fromName}" <${this.config!.from}>`,
      to,
      subject,
      html: htmlContent,
      text: textContent || htmlContent.replace(/<[^>]*>/g, '')
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      await this.logEmailSend('simple', to, 'success', info.messageId);
      return true;
    } catch (error) {
      await this.logEmailSend('simple', to, 'error', null, error);
      console.error('❌ Erro ao enviar email simples:', error);
      return false;
    }
  }

  /**
   * Registra envio de email no banco
   */
  private async logEmailSend(
    templateName: string,
    to: string,
    status: 'success' | 'error',
    messageId: string | null = null,
    error: any = null
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO email_logs (template_name, to_email, success, error_message, sent_at)
        VALUES ($1, $2, $3, $4, NOW())
      `;
      
      await pool.query(query, [
        templateName,
        to,
        status === 'success',
        error ? error.message : null
      ]);
    } catch (logError) {
      console.error('❌ Erro ao registrar log de email:', logError);
    }
  }

  /**
   * Gera código de verificação para 2FA
   */
  generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Envia código de verificação 2FA
   */
  async send2FACode(email: string, code: string): Promise<boolean> {
    return await this.sendTemplateEmail('2fa_verification', email, {
      code,
      expiration_minutes: '10'
    });
  }

  /**
   * Recarrega configurações e templates
   */
  async reload(): Promise<void> {
    this.templates.clear();
    await this.loadEmailConfig();
    await this.loadEmailTemplates();
  }
}

// Instância singleton
const emailServiceInstance = new EmailService();

// Promise de inicialização (lazy loading)
let initializationPromise: Promise<void> | null = null;
let isInitialized = false;

/**
 * Garante que o serviço está inicializado antes de usar
 */
async function ensureInitialized(): Promise<void> {
  if (isInitialized) {
    return; // Já inicializado
  }
  
  if (!initializationPromise) {
    initializationPromise = emailServiceInstance.initialize()
      .then(() => {
        isInitialized = true;
        console.log('✅ EmailService inicializado automaticamente');
      })
      .catch((error) => {
        console.error('❌ Erro na inicialização automática do EmailService:', error);
        initializationPromise = null; // Reset para permitir nova tentativa
        throw error;
      });
  }
  
  return initializationPromise;
}

/**
 * Wrapper do EmailService com inicialização automática
 */
const emailService = {
  /**
   * Envia email usando template
   */
  async sendTemplateEmail(
    templateName: string,
    to: string,
    variables: Record<string, string>
  ): Promise<boolean> {
    await ensureInitialized();
    return emailServiceInstance.sendTemplateEmail(templateName, to, variables);
  },

  /**
   * Envia código 2FA
   */
  async send2FACode(email: string, code: string): Promise<boolean> {
    await ensureInitialized();
    return emailServiceInstance.send2FACode(email, code);
  },

  /**
   * Gera código de verificação
   */
  generateVerificationCode(): string {
    return emailServiceInstance.generateVerificationCode();
  },

  /**
   * Recarrega configurações
   */
  async reload(): Promise<void> {
    await ensureInitialized();
    return emailServiceInstance.reload();
  },

  /**
   * Inicialização manual (se necessário)
   */
  async initialize(): Promise<void> {
    return ensureInitialized();
  }
};

export default emailService;

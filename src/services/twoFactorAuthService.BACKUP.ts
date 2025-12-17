import { Pool } from 'pg';
import crypto from 'crypto';
import emailServiceSimple from './emailServiceSimple';
import { getEnvironmentConfig } from '../lib/config/development';

// Obter configurações de ambiente
const envConfig = getEnvironmentConfig();

// Configuração do pool de conexão
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'net_imobiliaria',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Roberto@2007',
});

interface TwoFactorCode {
  id: number;
  user_id: number;
  code: string;
  method: string;
  expires_at: Date;
  used: boolean;
  ip_address?: string;
  user_agent?: string;
  created_at: Date;
}

interface TwoFactorConfig {
  id: number;
  user_id: number;
  method: string;
  email?: string;
  phone_number?: string;
  secret_key?: string;
  is_enabled: boolean;
  backup_codes?: string[];
  last_used?: Date;
  created_at: Date;
  updated_at: Date;
}

class TwoFactorAuthService {
  private readonly CODE_LENGTH = 6;
  private readonly CODE_EXPIRY_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 3;
  private readonly BACKUP_CODES_COUNT = 10;

  /**
   * Gera um código 2FA de 6 dígitos
   */
  generateCode(): string {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    return code;
  }

  /**
   * Gera códigos de backup para o usuário
   */
  generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < this.BACKUP_CODES_COUNT; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  /**
   * Envia código 2FA por email
   */
  async sendCodeByEmail(userId: string, email: string, ipAddress?: string, userAgent?: string): Promise<boolean> {
    try {
      // Gerar código
      const code = this.generateCode();
      const expiresAt = new Date(Date.now() + envConfig.TWO_FACTOR.CODE_EXPIRATION);

      // Salvar código no banco
      await this.saveCode(userId, code, 'email', expiresAt, ipAddress, userAgent);

      // Enviar email
      console.log('📧 DEBUG - Tentando enviar email 2FA para:', email);
      console.log('📧 DEBUG - Código gerado:', code);
      
      try {
        const success = await emailServiceSimple.send2FACode(email, code);
        
        console.log('📧 DEBUG - Email enviado com sucesso:', success);
        
        if (success) {
          // Log de auditoria
          await this.log2FAActivity(userId, 'code_sent', 'email', { email, ip_address: ipAddress });
          return true;
        }
        
        return false;
      } catch (emailError) {
        console.error('❌ DEBUG - Erro ao enviar email:', emailError);
        await this.log2FAActivity(userId, 'code_send_failed', 'email', { error: emailError.message });
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao enviar código 2FA por email:', error);
      await this.log2FAActivity(userId, 'code_send_failed', 'email', { error: error.message });
      return false;
    }
  }

  /**
   * Salva código 2FA no banco de dados
   */
  private async saveCode(
    userId: string, 
    code: string, 
    method: string, 
    expiresAt: Date, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<void> {
    const query = `
      INSERT INTO user_2fa_codes (user_id, code, method, expires_at, ip_address, user_agent, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `;
    
    await pool.query(query, [userId, code, method, expiresAt, ipAddress, userAgent]);
  }

  /**
   * Valida código 2FA
   */
  async validateCode(userId: string, code: string, method: string = 'email'): Promise<{
    valid: boolean;
    message: string;
    remainingAttempts?: number;
  }> {
    try {
      // Buscar código não expirado e não usado
      const codeQuery = `
        SELECT id, expires_at, created_at, ip_address, user_agent
        FROM user_2fa_codes 
        WHERE user_id = $1 
        AND code = $2 
        AND method = $3 
        AND used = false 
        AND expires_at > NOW()
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      
      const codeResult = await pool.query(codeQuery, [userId, code, method]);
      
      if (codeResult.rows.length === 0) {
        // Log tentativa inválida
        await this.log2FAActivity(userId, 'code_validation_failed', method, { 
          code, 
          reason: 'invalid_or_expired' 
        });
        
        return {
          valid: false,
          message: 'Código inválido ou expirado'
        };
      }

      const codeRecord = codeResult.rows[0];

      // Marcar código como usado
      await pool.query(
        'UPDATE user_2fa_codes SET used = true WHERE id = $1',
        [codeRecord.id]
      );

      // Log sucesso
      await this.log2FAActivity(userId, 'code_validation_success', method, { 
        code_id: codeRecord.id 
      });

      return {
        valid: true,
        message: 'Código validado com sucesso'
      };

    } catch (error) {
      console.error('❌ Erro ao validar código 2FA:', error);
      await this.log2FAActivity(userId, 'code_validation_error', method, { 
        error: error.message 
      });
      
      return {
        valid: false,
        message: 'Erro interno do servidor'
      };
    }
  }

  /**
   * Verifica se usuário tem 2FA habilitado
   */
  async is2FAEnabled(userId: string): Promise<boolean> {
    try {
      // Verificar primeiro na tabela users (campo two_fa_enabled)
      const usersQuery = `
        SELECT two_fa_enabled 
        FROM users 
        WHERE id = $1
      `;
      
      const usersResult = await pool.query(usersQuery, [userId]);
      
      if (usersResult.rows.length > 0) {
        const two_fa_enabled = usersResult.rows[0].two_fa_enabled;
        
        // Se two_fa_enabled = true na tabela users, retornar true
        if (two_fa_enabled) {
          console.log('🔐 2FA habilitado na tabela users para usuário:', userId);
          return true;
        }
      }
      
      // Se não estiver habilitado na tabela users, verificar na tabela user_2fa_config
      const configQuery = `
        SELECT is_enabled 
        FROM user_2fa_config 
        WHERE user_id = $1 AND method = 'email'
      `;
      
      const configResult = await pool.query(configQuery, [userId]);
      const isEnabled = configResult.rows.length > 0 && configResult.rows[0].is_enabled;
      
      console.log('🔐 2FA status para usuário', userId, ':', isEnabled);
      return isEnabled;
    } catch (error) {
      console.error('❌ Erro ao verificar 2FA:', error);
      return false;
    }
  }

  /**
   * Habilita 2FA para usuário
   */
  async enable2FA(userId: string, email: string): Promise<{
    success: boolean;
    message: string;
    backupCodes?: string[];
  }> {
    try {
      // Gerar códigos de backup
      const backupCodes = this.generateBackupCodes();
      const hashedBackupCodes = backupCodes.map(code => 
        crypto.createHash('sha256').update(code).digest('hex')
      );

      // Salvar configuração 2FA
      const insertQuery = `
        INSERT INTO user_2fa_config (user_id, method, email, is_enabled, backup_codes, created_at, updated_at)
        VALUES ($1, 'email', $2, true, $3, NOW(), NOW())
        ON CONFLICT (user_id, method) 
        DO UPDATE SET 
          email = $2,
          is_enabled = true,
          backup_codes = $3,
          updated_at = NOW()
      `;

      await pool.query(insertQuery, [userId, email, hashedBackupCodes]);

      // Log auditoria
      await this.log2FAActivity(userId, '2fa_enabled', 'email', { email });

      return {
        success: true,
        message: '2FA habilitado com sucesso',
        backupCodes
      };

    } catch (error) {
      console.error('❌ Erro ao habilitar 2FA:', error);
      await this.log2FAActivity(userId, '2fa_enable_failed', 'email', { 
        error: error.message 
      });
      
      return {
        success: false,
        message: 'Erro ao habilitar 2FA'
      };
    }
  }

  /**
   * Desabilita 2FA para usuário
   */
  async disable2FA(userId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Desabilitar configuração 2FA
      await pool.query(
        'UPDATE user_2fa_config SET is_enabled = false, updated_at = NOW() WHERE user_id = $1',
        [userId]
      );

      // Invalidar todos os códigos pendentes
      await pool.query(
        'UPDATE user_2fa_codes SET used = true WHERE user_id = $1 AND used = false',
        [userId]
      );

      // Log auditoria
      await this.log2FAActivity(userId, '2fa_disabled', 'email', {});

      return {
        success: true,
        message: '2FA desabilitado com sucesso'
      };

    } catch (error) {
      console.error('❌ Erro ao desabilitar 2FA:', error);
      await this.log2FAActivity(userId, '2fa_disable_failed', 'email', { 
        error: error.message 
      });
      
      return {
        success: false,
        message: 'Erro ao desabilitar 2FA'
      };
    }
  }

  /**
   * Limpa códigos expirados
   */
  async cleanupExpiredCodes(): Promise<void> {
    try {
      const result = await pool.query(
        'DELETE FROM user_2fa_codes WHERE expires_at < NOW()'
      );
      
      if (result.rowCount && result.rowCount > 0) {
        console.log(`🧹 Limpeza: ${result.rowCount} códigos 2FA expirados removidos`);
      }
    } catch (error) {
      console.error('❌ Erro na limpeza de códigos expirados:', error);
    }
  }

  /**
   * Log de atividades 2FA para auditoria
   */
  private async log2FAActivity(
    userId: string, 
    action: string, 
    method: string, 
    details: any
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO audit_2fa_logs (user_id, action, method, metadata, created_at)
        VALUES ($1, $2, $3, $4, NOW())
      `;
      
      await pool.query(query, [userId, action, method, JSON.stringify(details)]);
    } catch (error) {
      console.error('❌ Erro ao registrar log de auditoria 2FA:', error);
    }
  }

  /**
   * Obtém estatísticas de 2FA
   */
  async get2FAStats(): Promise<{
    totalUsers: number;
    usersWith2FA: number;
    totalCodes: number;
    expiredCodes: number;
  }> {
    try {
      const queries = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM users'),
        pool.query('SELECT COUNT(*) as count FROM user_2fa_config WHERE is_enabled = true'),
        pool.query('SELECT COUNT(*) as count FROM user_2fa_codes WHERE used = false'),
        pool.query('SELECT COUNT(*) as count FROM user_2fa_codes WHERE expires_at < NOW()')
      ]);

      return {
        totalUsers: parseInt(queries[0].rows[0].count),
        usersWith2FA: parseInt(queries[1].rows[0].count),
        totalCodes: parseInt(queries[2].rows[0].count),
        expiredCodes: parseInt(queries[3].rows[0].count)
      };
    } catch (error) {
      console.error('❌ Erro ao obter estatísticas 2FA:', error);
      return {
        totalUsers: 0,
        usersWith2FA: 0,
        totalCodes: 0,
        expiredCodes: 0
      };
    }
  }
}

// Instância singleton
const twoFactorAuthService = new TwoFactorAuthService();

export default twoFactorAuthService;

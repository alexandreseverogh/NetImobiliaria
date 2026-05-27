import crypto from 'crypto';
import emailService from './emailService';
import { getEnvironmentConfig } from '../lib/config/development';
import pool from '@/lib/database/connection';

// Obter configurações de ambiente
const envConfig = getEnvironmentConfig();

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

  // Função para obter username por ID
  private async getUsernameById(userId: string): Promise<string | null> {
    try {
      const result = await pool.query('SELECT username FROM users WHERE id = $1', [userId]);
      return result.rows[0]?.username || null;
    } catch (error) {
      console.error('Erro ao obter username:', error);
      return null;
    }
  }

  // Função para registrar logs de 2FA
  private async log2FAAttempt(
    userId: string,
    username: string,
    action: string,
    ipAddress: string,
    userAgent: string,
    success: boolean = true,
    reason?: string,
    tenantId?: string | null
  ) {
    try {
      await pool.query(`
        INSERT INTO login_logs (
          user_id,
          username,
          action,
          ip_address,
          user_agent,
          two_fa_used,
          two_fa_method,
          success,
          failure_reason,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `, [
        userId,
        username,
        action,
        ipAddress,
        userAgent,
        true, // 2FA sempre usa 2FA
        'email', // Método padrão
        success,
        reason || null
      ]);
    } catch (error) {
      console.error('Erro ao registrar log de 2FA:', error);
      // Não falhar o 2FA por causa do log
    }
  }

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
  async sendCodeByEmail(userId: string, email: string, ipAddress?: string, userAgent?: string, tenantId?: string | null): Promise<boolean> {
    try {
      // Gerar código
      const code = this.generateCode();
      const expiresAt = new Date(Date.now() + envConfig.TWO_FACTOR.CODE_EXPIRATION);

      // Salvar código no banco (expiration handled by DB)
      await this.saveCode(userId, code, 'email', expiresAt, ipAddress, userAgent);

      // Enviar email usando sistema dinâmico (corrigido)
      console.log('📧 DEBUG - Tentando enviar email 2FA para:', email);
      console.log('📧 DEBUG - Código gerado:', code);

      try {
        // Usar sistema dinâmico (corrigido)
        const success = await emailService.sendTemplateEmail('2fa-code', email, { code }, undefined, tenantId);

        console.log('📧 DEBUG - Email enviado com sucesso:', success);

        if (success) {
          // Log de auditoria
          await this.log2FAActivity(userId, 'code_sent', 'email', { email, ip_address: ipAddress }, tenantId);

          // Log de login para 2FA
          const username = await this.getUsernameById(userId);
          if (username) {
            await this.log2FAAttempt(userId, username, '2fa_required', ipAddress || 'unknown', userAgent || 'unknown', true, null, tenantId);
          }

          return true;
        }

        return false;
      } catch (emailError) {
        console.error('❌ DEBUG - Erro ao enviar email:', emailError);
        await this.log2FAActivity(userId, 'code_send_failed', 'email', { error: emailError instanceof Error ? emailError.message : String(emailError) }, tenantId);
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao enviar código 2FA por email:', error);
      await this.log2FAActivity(userId, 'code_send_failed', 'email', { error: error instanceof Error ? error.message : String(error) }, tenantId);
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
      VALUES ($1, $2, $3, NOW() + INTERVAL '10 minutes', $4, $5, NOW())
    `;

    await pool.query(query, [userId, code, method, ipAddress, userAgent]);
  }

  /**
   * Valida código 2FA
   */
  async validateCode(userId: string, code: string, method: string = 'email', tenantId?: string | null): Promise<{
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

      console.log('🔍 DEBUG 2FA VALIDATION:', {
        userId,
        code,
        method,
        rowsFound: codeResult.rows.length
      });

      if (codeResult.rows.length === 0) {
        // Debug failed reason
        const checkQuery = `SELECT * FROM user_2fa_codes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 3`;
        const checkRes = await pool.query(checkQuery, [userId]);
        console.log('🔍 DEBUG 2FA - Recent codes for user:', checkRes.rows.map(r => ({
          id: r.id,
          code: r.code,
          used: r.used,
          expires: r.expires_at,
          now_db: new Date(), /* JS Time */
          created: r.created_at
        })));

        // Check DB time
        const timeRes = await pool.query('SELECT NOW()::text as db_time');
        console.log('🔍 DEBUG 2FA - DB Time:', timeRes.rows[0].db_time);

        // Log tentativa inválida
        await this.log2FAActivity(userId, 'code_validation_failed', method, {
          code,
          reason: 'invalid_or_expired'
        });

        // Log de login para 2FA
        const username = await this.getUsernameById(userId);
        if (username) {
          await this.log2FAAttempt(userId, username, '2fa_failed', 'unknown', 'unknown', false, 'Código inválido ou expirado', tenantId);
        }

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
      }, tenantId);

      // Log de login para 2FA
      const username = await this.getUsernameById(userId);
      if (username) {
        await this.log2FAAttempt(userId, username, '2fa_success', codeRecord.ip_address || 'unknown', codeRecord.user_agent || 'unknown', true, null, tenantId);
      }

      return {
        valid: true,
        message: 'Código validado com sucesso'
      };

    } catch (error) {
      console.error('❌ Erro ao validar código 2FA:', error);
      await this.log2FAActivity(userId, 'code_validation_error', method, {
        error: error instanceof Error ? error.message : String(error)
      }, tenantId);

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
      // 1. Verificar primeiro se o PERFIL do usuário requer 2FA
      const roleQuery = `
        SELECT ur.requires_2fa
        FROM users u
        JOIN user_role_assignments ura ON u.id = ura.user_id
        JOIN user_roles ur ON ura.role_id = ur.id
        WHERE u.id = $1
      `;

      const roleResult = await pool.query(roleQuery, [userId]);

      if (roleResult.rows.length > 0) {
        const roleRequires2FA = roleResult.rows[0].requires_2fa;

        // Se o perfil requer 2FA, verificar se usuário já configurou
        if (roleRequires2FA) {
          console.log('🔐 Perfil requer 2FA para usuário:', userId);

          // Verificar se usuário já configurou 2FA
          const usersQuery = `
            SELECT two_fa_enabled 
            FROM users 
            WHERE id = $1
          `;

          const usersResult = await pool.query(usersQuery, [userId]);

          if (usersResult.rows.length > 0) {
            const two_fa_enabled = usersResult.rows[0].two_fa_enabled;

            if (two_fa_enabled) {
              console.log('🔐 2FA já configurado pelo usuário:', userId);
              return true;
            } else {
              console.log('⚠️ Perfil requer 2FA mas usuário não configurou ainda:', userId);
              // Retornar true para forçar configuração
              return true;
            }
          }
        }
      }

      // 2. Verificar campo two_fa_enabled na tabela users (para usuários que habilitaram manualmente)
      const usersQuery = `
        SELECT two_fa_enabled 
        FROM users 
        WHERE id = $1
      `;

      const usersResult = await pool.query(usersQuery, [userId]);

      if (usersResult.rows.length > 0) {
        const two_fa_enabled = usersResult.rows[0].two_fa_enabled;

        if (two_fa_enabled) {
          console.log('🔐 2FA habilitado manualmente na tabela users para usuário:', userId);
          return true;
        }
      }

      // 3. Verificar na tabela user_2fa_config (método legado)
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
  async enable2FA(userId: string, email: string, tenantId?: string | null): Promise<{
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
      await this.log2FAActivity(userId, '2fa_enabled', 'email', { email }, tenantId);

      return {
        success: true,
        message: '2FA habilitado com sucesso',
        backupCodes
      };

    } catch (error) {
      console.error('❌ Erro ao habilitar 2FA:', error);
      await this.log2FAActivity(userId, '2fa_enable_failed', 'email', {
        error: error instanceof Error ? error.message : String(error)
      }, tenantId);

      return {
        success: false,
        message: 'Erro ao habilitar 2FA'
      };
    }
  }

  /**
   * Desabilita 2FA para usuário
   */
  async disable2FA(userId: string, tenantId?: string | null): Promise<{
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
      await this.log2FAActivity(userId, '2fa_disabled', 'email', {}, tenantId);

      return {
        success: true,
        message: '2FA desabilitado com sucesso'
      };

    } catch (error) {
      console.error('❌ Erro ao desabilitar 2FA:', error);
      await this.log2FAActivity(userId, '2fa_disable_failed', 'email', {
        error: error instanceof Error ? error.message : String(error)
      }, tenantId);

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
    details: any,
    tenantId?: string | null
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

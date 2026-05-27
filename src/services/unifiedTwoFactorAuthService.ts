import pool from '@/lib/database/connection';
import crypto from 'crypto';
import emailService from './emailService';

type UserType = 'admin' | 'cliente' | 'proprietario';

interface Send2FACodeParams {
  userUuid: string;
  userType: UserType;
  email: string;
  ipAddress: string;
  userAgent: string;
}

interface Validate2FACodeParams {
  userUuid: string;
  userType: UserType;
  code: string;
  method?: string;
}

class UnifiedTwoFactorAuthService {
  private readonly CODE_LENGTH = 6;
  private readonly CODE_EXPIRY_MINUTES = 10;

  /**
   * Verifica se o 2FA está habilitado para um usuário
   */
  async is2FAEnabled(userUuid: string, userType: UserType): Promise<boolean> {
    try {
      let query: string;
      const params: any[] = [userUuid];

      if (userType === 'admin') {
        query = 'SELECT two_fa_enabled FROM users WHERE id = $1::uuid';
      } else {
        const tableName = userType === 'cliente' ? 'clientes' : 'proprietarios';
        query = `SELECT two_fa_enabled FROM ${tableName} WHERE uuid = $1::uuid`;
      }

      const result = await pool.query(query, params);
      return result.rows[0]?.two_fa_enabled === true;
    } catch (error) {
      console.error('❌ Erro ao verificar status do 2FA:', error);
      return false;
    }
  }

  /**
   * Envia código 2FA por email
   */
  async sendCodeByEmail(params: Send2FACodeParams): Promise<boolean> {
    const { userUuid, userType, email, ipAddress, userAgent } = params;

    try {
      console.log(`📧 [UNIFIED 2FA] Enviando código para ${userType} UUID:`, userUuid);
      console.log(`📧 [UNIFIED 2FA] Email destino:`, email);

      // Gerar código de 6 dígitos
      const code = this.generateCode();
      console.log(`🔢 [UNIFIED 2FA] Código gerado:`, code);

      // Calcular data de expiração
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + this.CODE_EXPIRY_MINUTES);
      console.log(`⏰ [UNIFIED 2FA] Expira em:`, expiresAt);

      // Salvar código no banco
      console.log(`💾 [UNIFIED 2FA] Salvando código no banco...`);
      await this.saveCode(userUuid, userType, code, 'email', expiresAt, ipAddress, userAgent);
      console.log(`✅ [UNIFIED 2FA] Código salvo no banco`);

      // Enviar email usando o mesmo método do admin
      console.log(`📤 [UNIFIED 2FA] Enviando email...`);
      try {
        // Garantir que o emailService está inicializado
        await emailService.initialize();
        console.log(`✅ [UNIFIED 2FA] EmailService inicializado`);

        // Usar sendTemplateEmail com o mesmo template do admin ('2fa-code')
        console.log(`📧 [UNIFIED 2FA] Tentando enviar com template '2fa-code' para:`, email);
        const emailSent = await emailService.sendTemplateEmail('2fa-code', email, { code });

        if (!emailSent) {
          console.error('❌ [UNIFIED 2FA] Erro ao enviar email com código 2FA (retornou false)');
          console.error('❌ [UNIFIED 2FA] Verifique se o template "2fa-code" existe no banco de dados');
          return false;
        }

        console.log(`✅ [UNIFIED 2FA] Email enviado com sucesso`);
      } catch (emailError: any) {
        console.error('❌ [UNIFIED 2FA] Erro ao enviar email:', emailError);
        console.error('❌ [UNIFIED 2FA] Tipo do erro:', typeof emailError);
        console.error('❌ [UNIFIED 2FA] Stack:', emailError?.stack);
        console.error('❌ [UNIFIED 2FA] Detalhes:', {
          message: emailError?.message,
          code: emailError?.code,
          name: emailError?.name
        });

        // Se o template não existe, tentar com '2fa_verification' como fallback
        if (emailError?.message?.includes('não encontrado') || emailError?.message?.includes('Template')) {
          console.log(`⚠️ [UNIFIED 2FA] Template '2fa-code' não encontrado, tentando '2fa_verification'...`);
          try {
            const fallbackSent = await emailService.sendTemplateEmail('2fa_verification', email, {
              code,
              expiration_minutes: '10'
            });
            if (fallbackSent) {
              console.log(`✅ [UNIFIED 2FA] Email enviado com sucesso usando template fallback`);
              return true;
            }
          } catch (fallbackError: any) {
            console.error('❌ [UNIFIED 2FA] Erro no fallback também:', fallbackError?.message);
          }
        }

        return false;
      }

      console.log(`✅ [UNIFIED 2FA] Código enviado com sucesso para ${userType} UUID:`, userUuid);

      // Registrar log de auditoria (não crítico se falhar)
      try {
        await this.logAuditAction(userUuid, userType, '2FA_CODE_SENT', 'email', { ipAddress, userAgent });
        console.log(`✅ [UNIFIED 2FA] Log de auditoria registrado`);
      } catch (auditError: any) {
        console.error('⚠️ [UNIFIED 2FA] Erro ao registrar log de auditoria (não crítico):', auditError?.message);
        // Não bloquear o fluxo se o log falhar
      }

      return true;
    } catch (error) {
      console.error('❌ [UNIFIED 2FA] Erro ao enviar código 2FA:', error);
      console.error('❌ [UNIFIED 2FA] Stack:', error instanceof Error ? error.stack : 'sem stack');
      return false;
    }
  }

  /**
   * Valida código 2FA fornecido pelo usuário
   */
  async validateCode(params: Validate2FACodeParams): Promise<{ valid: boolean; message: string }> {
    const { userUuid, userType, code, method = 'email' } = params;

    try {
      // Buscar código válido
      const result = await pool.query(
        `
          SELECT * FROM user_2fa_codes 
          WHERE user_id = $1::uuid
          AND code = $2 
          AND method = $3 
          AND used = false 
          AND expires_at > (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')
          ORDER BY created_at DESC 
          LIMIT 1
        `,
        [userUuid, code, method]
      );

      if (result.rows.length === 0) {
        await this.logAuditAction(userUuid, userType, '2FA_FAILED', method, { reason: 'Código inválido ou expirado' });
        return {
          valid: false,
          message: 'Código inválido ou expirado'
        };
      }

      // Marcar código como usado
      await pool.query(
        'UPDATE user_2fa_codes SET used = true WHERE id = $1',
        [result.rows[0].id]
      );

      // Registrar último uso na configuração
      await this.updateLastUsed(userUuid, userType, method);

      // Registrar log de auditoria
      await this.logAuditAction(userUuid, userType, '2FA_SUCCESS', method);

      return {
        valid: true,
        message: 'Código validado com sucesso'
      };
    } catch (error) {
      console.error('❌ [UNIFIED 2FA] Erro ao validar código 2FA:', error);
      return {
        valid: false,
        message: 'Erro ao validar código'
      };
    }
  }

  /**
   * Gera código numérico aleatório
   */
  private generateCode(): string {
    const min = Math.pow(10, this.CODE_LENGTH - 1);
    const max = Math.pow(10, this.CODE_LENGTH) - 1;
    const code = Math.floor(Math.random() * (max - min + 1)) + min;
    return code.toString();
  }

  /**
   * Salva código 2FA no banco de dados
   */
  private async saveCode(
    userUuid: string,
    userType: UserType,
    code: string,
    method: string,
    expiresAt: Date,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    console.log(`💾 [UNIFIED 2FA] saveCode - userUuid:`, userUuid, `userType:`, userType);

    // Validar se userUuid é um UUID válido
    if (!userUuid || typeof userUuid !== 'string') {
      throw new Error(`userUuid inválido: ${userUuid}`);
    }

    // Verificar formato UUID básico (8-4-4-4-12 caracteres hexadecimais)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userUuid)) {
      console.error(`❌ [UNIFIED 2FA] userUuid não é um UUID válido:`, userUuid);
      throw new Error(`userUuid não é um UUID válido: ${userUuid}`);
    }

    try {
      // Verificar se a tabela tem user_type, caso contrário usar apenas user_id
      const query = `
        INSERT INTO user_2fa_codes (user_id, user_id_int, user_type, code, method, expires_at, ip_address, user_agent, created_at)
        VALUES ($1::uuid, NULL, $2, $3, $4, $5, $6, $7, NOW())
      `;

      const params = [userUuid, userType, code, method, expiresAt, ipAddress, userAgent];

      console.log(`📝 [UNIFIED 2FA] Query:`, query);
      console.log(`📝 [UNIFIED 2FA] Params:`, params.map((p, i) => i === 0 ? `${p} (${typeof p})` : p));

      try {
        await pool.query(query, params);
        console.log(`✅ [UNIFIED 2FA] Código salvo com sucesso`);
      } catch (insertError: any) {
        // Se falhar por causa de colunas faltantes, tentar sem user_type e user_id_int
        if (insertError.message?.includes('column') || insertError.code === '42703') {
          console.log(`⚠️ [UNIFIED 2FA] Tentando inserir sem user_type/user_id_int...`);
          const fallbackQuery = `
            INSERT INTO user_2fa_codes (user_id, code, method, expires_at, ip_address, user_agent, created_at)
            VALUES ($1::uuid, $2, $3, $4, $5, $6, NOW())
          `;
          const fallbackParams = [userUuid, code, method, expiresAt, ipAddress, userAgent];
          await pool.query(fallbackQuery, fallbackParams);
          console.log(`✅ [UNIFIED 2FA] Código salvo com sucesso (fallback)`);
        } else {
          throw insertError;
        }
      }
    } catch (error: any) {
      console.error(`❌ [UNIFIED 2FA] Erro ao salvar código no banco:`, error.message);
      console.error(`❌ [UNIFIED 2FA] Stack:`, error.stack);
      console.error(`❌ [UNIFIED 2FA] Detalhes:`, {
        userUuid,
        userType,
        code,
        method,
        errorCode: error.code,
        errorDetail: error.detail
      });
      throw error;
    }
  }

  /**
   * Atualiza último uso do 2FA
   */
  private async updateLastUsed(userUuid: string, userType: UserType, method: string): Promise<void> {
    const query = `
      INSERT INTO user_2fa_config (user_id, user_id_int, user_type, method, is_enabled, last_used, created_at, updated_at)
      VALUES ($1::uuid, NULL, $2, $3, true, NOW(), NOW(), NOW())
      ON CONFLICT (user_id, method) 
      DO UPDATE SET last_used = NOW(), updated_at = NOW()
    `;

    const params = [userUuid, userType, method];

    await pool.query(query, params).catch(err => {
      console.error('⚠️ [UNIFIED 2FA] Erro ao atualizar last_used (não crítico):', err.message);
    });
  }

  /**
   * Registra log de auditoria para ações de 2FA
   */
  private async logAuditAction(
    userUuid: string,
    userType: UserType,
    action: string,
    method: string,
    metadata?: any
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO audit_logs (user_id, user_id_int, public_user_uuid, user_type, action, resource, details, timestamp)
        VALUES (
          ${userType === 'admin' ? '$1::uuid' : 'NULL'},
          NULL,
          ${userType === 'admin' ? 'NULL' : '$1::uuid'},
          $2,
          $3,
          '2FA',
          $4,
          NOW()
        )
      `;

      const params = [
        userUuid,
        userType,
        action,
        metadata ? JSON.stringify(metadata) : null
      ];

      await pool.query(query, params);
    } catch (error) {
      console.error('❌ [UNIFIED 2FA] Erro ao registrar log de auditoria:', error);
    }
  }

  /**
   * Limpa códigos expirados
   */
  async cleanupExpiredCodes(): Promise<void> {
    try {
      await pool.query('DELETE FROM user_2fa_codes WHERE expires_at < NOW()');
      console.log('✅ [UNIFIED 2FA] Códigos expirados removidos');
    } catch (error) {
      console.error('❌ [UNIFIED 2FA] Erro ao limpar códigos expirados:', error);
    }
  }
}

// Instância singleton
const unifiedTwoFactorAuthService = new UnifiedTwoFactorAuthService();

export default unifiedTwoFactorAuthService;


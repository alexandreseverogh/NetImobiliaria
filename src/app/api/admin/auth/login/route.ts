import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import twoFactorAuthService from '../../../../../services/twoFactorAuthService';
import { User } from '../../../../../lib/database/users';
import { logLoginAttempt as logSecurityLoginAttempt, logSuspiciousActivity } from '../../../../../lib/monitoring/securityMonitor';
import { AUTH_CONFIG } from '@/lib/config/auth';

// Configuração do pool de conexão
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'net_imobiliaria',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Roberto@2007',
});

interface LoginRequest {
  username: string;
  password: string;
  twoFactorCode?: string;
}

// Função para registrar logs de login
async function logLoginAttempt(
  client: any,
  userId: string | null,
  username: string,
  action: 'login' | 'login_failed' | '2fa_required' | '2fa_success' | '2fa_failed',
  ipAddress: string,
  userAgent: string,
  twoFaUsed: boolean = false,
  reason?: string
) {
  try {
    // Log na tabela login_logs
    await client.query(`
      INSERT INTO login_logs (
        user_id,
        username,
        action,
        ip_address,
        user_agent,
        two_fa_used,
        success,
        failure_reason,
        created_at
      ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, NOW())
    `, [
      userId,
      username,
      action,
      ipAddress,
      userAgent,
      twoFaUsed,
      action === 'login' || action === '2fa_success',
      reason || null
    ]);

    // Log na tabela audit_logs
    const auditAction = action === 'login' ? 'LOGIN_SUCCESS' :
      action === 'login_failed' ? 'LOGIN_FAILED' :
        action === '2fa_success' ? '2FA_SUCCESS' :
          action === '2fa_failed' ? '2FA_FAILED' : 'LOGIN_ATTEMPT';

    await client.query(`
      INSERT INTO audit_logs (
        user_id,
        action,
        resource,
        resource_id,
        details,
        ip_address,
        user_agent,
        timestamp
      ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, NOW())
    `, [
      userId,
      auditAction,
      'AUTH',
      null,
      JSON.stringify({ username, two_fa_used: twoFaUsed, reason: reason || null }),
      ipAddress,
      userAgent
    ]);
  } catch (error) {
    console.error('Erro ao registrar log de login:', error);
    // Não falhar o login por causa do log
  }
}

// Função auxiliar para determinar o nível de permissão (NOVO - 6 níveis granulares)
function getPermissionLevel(permission: string): number {
  const levels: { [key: string]: number } = {
    'READ': 1,
    'EXECUTE': 2,
    'CREATE': 3,
    'UPDATE': 4,
    'DELETE': 5,
    'ADMIN': 6
  };

  return levels[permission] || 0;
}

export async function POST(request: NextRequest) {
  console.log('🔍 [LOGIN] Início da requisição POST');
  try {
    console.log('🔍 [LOGIN] Parseando body...');
    const body: LoginRequest = await request.json();
    const { username, password, twoFactorCode } = body;
    console.log('🔍 [LOGIN] Body parseado:', { username, hasPassword: !!password, twoFactorCode });

    // Validar dados de entrada
    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Obter IP real do cliente (múltiplas tentativas)
    let ipAddress = 'unknown';

    // Tentar diferentes headers de proxy
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const cfConnectingIp = request.headers.get('cf-connecting-ip');
    const clientIp = request.headers.get('x-client-ip');

    if (forwardedFor) {
      // x-forwarded-for pode ter múltiplos IPs, pegar o primeiro
      ipAddress = forwardedFor.split(',')[0].trim();
    } else if (realIp) {
      ipAddress = realIp;
    } else if (cfConnectingIp) {
      ipAddress = cfConnectingIp;
    } else if (clientIp) {
      ipAddress = clientIp;
    } else {
      // Fallback para IP de conexão direta
      ipAddress = request.ip || '127.0.0.1';
    }

    // Se for IP local ou desconhecido/inválido para inet
    if (ipAddress === '::1' || ipAddress === 'unknown' || !ipAddress) {
      ipAddress = '127.0.0.1';
    } else if (ipAddress === 'localhost') {
      ipAddress = '127.0.0.1';
    }

    // Validar formato básico de IP (se não for ipv4/ipv6, fallback)
    // Regex simples ou apenas confiar no fallback anterior
    if (!ipAddress.includes('.') && !ipAddress.includes(':')) {
      ipAddress = '127.0.0.1';
    }

    console.log('🔍 DEBUG IP - Headers capturados:', {
      'x-forwarded-for': forwardedFor,
      'x-real-ip': realIp,
      'cf-connecting-ip': cfConnectingIp,
      'x-client-ip': clientIp,
      'request.ip': request.ip,
      'ip_final': ipAddress,
      'is_local': ipAddress === '::1' || ipAddress === '127.0.0.1'
    });
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // 1. Buscar usuário no banco com informações do perfil
    const userQuery = `
      SELECT 
        u.id, u.username, u.email, u.password, u.nome, u.telefone, u.creci, u.cpf, u.foto, u.foto_tipo_mime, u.ativo as is_active,
        u.two_fa_enabled, u.isencao,
        ur.name as role_name, ur.description as role_description, ur.level as role_level
      FROM users u
      LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
      LEFT JOIN user_roles ur ON ura.role_id = ur.id
      WHERE u.username = $1 OR u.email = $1
      ORDER BY ur.level DESC NULLS LAST
      LIMIT 1
    `;

    const userResult = await pool.query(userQuery, [username]);

    if (userResult.rows.length === 0) {
      // Log tentativa de login com usuário inexistente
      const client = await pool.connect();
      try {
        await logLoginAttempt(client, null, username, 'login_failed', ipAddress, userAgent, false, 'Usuário não encontrado');
      } finally {
        client.release();
      }

      // Log no sistema de monitoramento de segurança
      logSecurityLoginAttempt(ipAddress, userAgent, false, undefined);

      return NextResponse.json(
        { success: false, message: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    const user: User = userResult.rows[0];

    // Mapear campo do banco para compatibilidade com interface
    user.two_factor_enabled = user.two_fa_enabled;

    // 2. Verificar se conta está ativa
    if (!user.is_active) {
      const client = await pool.connect();
      try {
        await logLoginAttempt(client, user.id, username, 'login_failed', ipAddress, userAgent, false, 'Conta desativada');
      } finally {
        client.release();
      }

      // Log no sistema de monitoramento de segurança
      logSecurityLoginAttempt(ipAddress, userAgent, false, user.id);

      return NextResponse.json(
        { success: false, message: 'Conta desativada' },
        { status: 401 }
      );
    }

    // 3. Verificar se conta está bloqueada (desabilitado por enquanto)
    // if (user.locked_until && new Date(user.locked_until) > new Date()) {
    //   await logLoginAttempt(username, ipAddress, userAgent, 'account_locked', user.id);
    //   
    //   return NextResponse.json(
    //     { 
    //       success: false, 
    //       message: 'Conta bloqueada temporariamente devido a muitas tentativas falhadas' 
    //     },
    //     { status: 423 }
    //   );
    // }

    // 4. Verificar senha
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      // Log tentativa de login com senha incorreta
      const client = await pool.connect();
      try {
        await logLoginAttempt(client, user.id, username, 'login_failed', ipAddress, userAgent, false, 'Senha incorreta');
      } finally {
        client.release();
      }

      // Log no sistema de monitoramento de segurança
      logSecurityLoginAttempt(ipAddress, userAgent, false, user.id);

      return NextResponse.json(
        { success: false, message: 'Credenciais inválidas' },
        { status: 401 }
      );
    }

    // 5. Verificar se 2FA está habilitado
    console.log('🔍 DEBUG LOGIN - Verificando 2FA para usuário:', user.username, 'ID:', user.id);
    console.log('🔍 DEBUG LOGIN - Campo two_fa_enabled do usuário:', user.two_fa_enabled);
    console.log('🔍 DEBUG LOGIN - Campo two_factor_enabled mapeado:', user.two_factor_enabled);

    let is2FAEnabled = false;
    try {
      is2FAEnabled = await twoFactorAuthService.is2FAEnabled(user.id);
      console.log('🔍 DEBUG LOGIN - 2FA habilitado para usuário', user.username, ':', is2FAEnabled);
    } catch (error2FA) {
      console.error('❌ Erro ao verificar 2FA:', error2FA);
      console.error('❌ Stack trace 2FA:', error2FA instanceof Error ? error2FA.stack : 'N/A');
      // Continuar sem 2FA em caso de erro
      is2FAEnabled = false;
    }

    if (is2FAEnabled) {
      console.log('🔐 2FA requerido para usuário:', user.username);
      // Se 2FA está habilitado mas código não foi fornecido
      if (!twoFactorCode) {
        // Enviar código 2FA
        try {
          console.log('📧 Tentando enviar código 2FA para:', user.email);
          const codeSent = await twoFactorAuthService.sendCodeByEmail(
            user.id,
            user.email,
            ipAddress,
            userAgent
          );

          if (codeSent) {
            // Log que 2FA foi requerido
            const client = await pool.connect();
            try {
              await logLoginAttempt(client, user.id, username, '2fa_required', ipAddress, userAgent, false, 'Código 2FA enviado por email');
            } finally {
              client.release();
            }

            return NextResponse.json(
              {
                success: false,
                requires2FA: true,
                message: 'Código de verificação enviado por email'
              },
              { status: 200 }
            );
          } else {
            console.error('❌ Falha ao enviar código 2FA');
            return NextResponse.json(
              { success: false, message: 'Erro ao enviar código de verificação' },
              { status: 500 }
            );
          }
        } catch (errorSendCode) {
          console.error('❌ Exceção ao enviar código 2FA:', errorSendCode);
          console.error('❌ Stack trace envio código:', errorSendCode instanceof Error ? errorSendCode.stack : 'N/A');
          return NextResponse.json(
            {
              success: false,
              message: 'Erro ao enviar código de verificação',
              ...(process.env.NODE_ENV === 'development' && {
                error: errorSendCode instanceof Error ? errorSendCode.message : String(errorSendCode)
              })
            },
            { status: 500 }
          );
        }
      } else {
        // Validar código 2FA
        const validationResult = await twoFactorAuthService.validateCode(
          user.id,
          twoFactorCode,
          'email'
        );

        if (!validationResult.valid) {
          const client = await pool.connect();
          try {
            await logLoginAttempt(client, user.id, username, '2fa_failed', ipAddress, userAgent, true, validationResult.message);
          } finally {
            client.release();
          }

          return NextResponse.json(
            { success: false, message: validationResult.message },
            { status: 401 }
          );
        }
      }

      // Log 2FA success se 2FA foi usado
      if (is2FAEnabled) {
        const client = await pool.connect();
        try {
          await logLoginAttempt(client, user.id, username, '2fa_success', ipAddress, userAgent, true, 'Código 2FA validado com sucesso');
        } finally {
          client.release();
        }
      }
    }

    // 6. Login bem-sucedido - Atualizar último login
    await updateLastLogin(user.id);

    // 7. Buscar permissões do usuário (usando category_id da nova estrutura)
    // Query de permissões reais
    const permissionsQuery = `
      SELECT 
        sf.slug as resource,
        CASE 
          WHEN p.action = 'admin' THEN 'ADMIN'
          WHEN p.action = 'delete' THEN 'DELETE'
          WHEN p.action = 'update' THEN 'UPDATE'
          WHEN p.action = 'create' THEN 'CREATE'
          WHEN p.action = 'execute' THEN 'EXECUTE'
          WHEN p.action = 'read' OR p.action = 'list' THEN 'READ'
          ELSE p.action
        END as permission_level
      FROM users u
      JOIN user_role_assignments ura ON u.id = ura.user_id
      JOIN user_roles ur ON ura.role_id = ur.id
      JOIN role_permissions rp ON ur.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      LEFT JOIN system_categorias sc ON sf.category_id = sc.id
      WHERE u.id = $1 
        AND u.ativo = true
        AND ura.role_id IN (
          SELECT id FROM user_roles WHERE is_active = true
        )
        AND sf.is_active = true
      ORDER BY sc.sort_order, p.action
    `;

    console.log('🔍 DEBUG LOGIN - Executando query de permissões para usuário ID:', user.id);

    let permissionsMap: { [key: string]: string } = {};

    try {
      const permissionsResult = await pool.query(permissionsQuery, [user.id]);
      console.log('✅ DEBUG LOGIN - Query de permissões executada com sucesso');
      console.log('🔍 DEBUG LOGIN - Resultado:', permissionsResult.rows.length, 'permissões encontradas');

      // Organizar permissões por recurso
      permissionsResult.rows.forEach((row: any) => {
        const { resource, permission_level } = row;
        // Manter o nível mais alto de permissão para cada recurso
        if (!permissionsMap[resource] || getPermissionLevel(permission_level) > getPermissionLevel(permissionsMap[resource])) {
          permissionsMap[resource] = permission_level;
        }
      });

      // DEBUG: Log das permissões carregadas
      console.log('🔍 DEBUG LOGIN - Permissões carregadas para usuário:', user.username);
      console.log('🔍 DEBUG LOGIN - Total de permissões:', permissionsResult.rows.length);
      console.log('🔍 DEBUG LOGIN - Mapa de permissões:', permissionsMap);
      console.log('🔍 DEBUG LOGIN - Permissão para usuários:', permissionsMap['usuarios']);

    } catch (permissionsError) {
      console.error('❌ DEBUG LOGIN - Erro na query de permissões:', permissionsError);
      // Continuar com permissões vazias se houver erro
      permissionsMap = {};
      console.log('⚠️ DEBUG LOGIN - Continuando com permissões vazias devido ao erro');
    }

    // 8. Gerar JWT com permissões
    // USAR CONFIGURAÇÃO CENTRALIZADA para garantir consistência com o verifyToken
    const jwtSecret = AUTH_CONFIG.JWT.SECRET;

    console.log('🔍 DEBUG LOGIN - Finalizando login com sucesso');

    const jwtPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
      role_name: user.role_name || 'Usuário',
      role_level: user.role_level || 1,
      is2FAEnabled: is2FAEnabled,
      permissoes: permissionsMap
    };

    console.log('🔍 DEBUG LOGIN - Token Payload:', JSON.stringify(jwtPayload, null, 2));

    const token = jwt.sign(jwtPayload, jwtSecret, {
      expiresIn: '1h'
    } as SignOptions);

    // 8. Criar sessão no banco
    const sessionId = await createUserSession(user.id, ipAddress, userAgent);

    // 9. Log login bem-sucedido
    const client = await pool.connect();
    try {
      await logLoginAttempt(client, user.id, username, 'login', ipAddress, userAgent, is2FAEnabled);
    } finally {
      client.release();
    }

    // Log no sistema de monitoramento de segurança
    logSecurityLoginAttempt(ipAddress, userAgent, true, user.id);

    // 10. Retornar resposta de sucesso com HTTP-only cookie
    const rawFoto = (user as any).foto
    const rawFotoMime = (user as any).foto_tipo_mime || null
    let fotoBase64: string | null = null

    // `pg` pode retornar BYTEA como Buffer, Uint8Array, ou como string "\\x...." (hex).
    // Em alguns ambientes/colunas, pode vir como string base64 (TEXT) ou string binária.
    // Garantimos conversão robusta para base64.
    if (rawFoto) {
      try {
        if (Buffer.isBuffer(rawFoto)) {
          fotoBase64 = rawFoto.toString('base64')
        } else if (typeof rawFoto === 'string') {
          const s = rawFoto.trim()
          // Caso padrão do Postgres BYTEA (hex com prefixo \x)
          if (s.startsWith('\\x')) {
            fotoBase64 = Buffer.from(s.slice(2), 'hex').toString('base64')
          } else {
            // Se já parece base64, usa como está
            const looksBase64 =
              s.length >= 16 &&
              s.length % 4 === 0 &&
              /^[A-Za-z0-9+/]+={0,2}$/.test(s)

            if (looksBase64) {
              fotoBase64 = s
            } else {
              // fallback: string binária (latin1)
              fotoBase64 = Buffer.from(s, 'latin1').toString('base64')
            }
          }
        } else if (rawFoto instanceof Uint8Array) {
          fotoBase64 = Buffer.from(rawFoto).toString('base64')
        }
      } catch {
        fotoBase64 = null
      }
    }

    // Create response with token in body
    const response = NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        token,
        sessionId,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          nome: user.nome,
          telefone: (user as any).telefone || null,
          cpf: (user as any).cpf || null,
          creci: (user as any).creci || null,
          isencao: (user as any).isencao === true || (user as any).isencao === 't',
          foto: fotoBase64,
          foto_tipo_mime: rawFotoMime,
          is2FAEnabled,
          role_name: user.role_name, // EXPOSED FOR DEBUG
          role_level: user.role_level
        }
      }
    });

    // Set HTTP-only cookie for token persistence
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/'
    });

    console.log('✅ HTTP-only cookie auth_token set successfully');

    return response;

  } catch (error) {
    console.error('❌ Erro no login:', error);
    console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'N/A');
    console.error('❌ Detalhes do erro:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error)
    });

    // SEMPRE retornar detalhes do erro para debug
    return NextResponse.json(
      {
        success: false,
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        errorName: error instanceof Error ? error.name : 'Unknown'
      },
      { status: 500 }
    );
  }
}

// Funções auxiliares

async function incrementFailedAttempts(userId: string): Promise<void> {
  const query = `
    UPDATE users 
    SET failed_login_attempts = failed_login_attempts + 1,
        locked_until = CASE 
          WHEN failed_login_attempts + 1 >= 5 
          THEN NOW() + INTERVAL '30 minutes'
          ELSE locked_until
        END
    WHERE id = $1
  `;

  await pool.query(query, [userId]);
}

async function resetFailedAttempts(userId: number): Promise<void> {
  const query = `
    UPDATE users 
    SET failed_login_attempts = 0, locked_until = NULL
    WHERE id = $1
  `;

  await pool.query(query, [userId]);
}

async function createUserSession(userId: string, ipAddress: string, userAgent: string): Promise<string> {
  const refreshToken = require('crypto').randomUUID();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 horas

  const query = `
    INSERT INTO user_sessions (user_id, refresh_token, expires_at, created_at, last_used_at, ip_address)
    VALUES ($1::uuid, $2, $3, NOW(), NOW(), $4)
  `;

  await pool.query(query, [userId, refreshToken, expiresAt, ipAddress]);

  return refreshToken;
}


// Função para atualizar o último login do usuário
async function updateLastLogin(userId: string): Promise<void> {
  try {
    const query = `
      UPDATE users 
      SET ultimo_login = NOW() 
      WHERE id = $1
    `;

    await pool.query(query, [userId]);
    console.log(`✅ Último login atualizado para usuário ID: ${userId}`);
  } catch (error) {
    console.error('❌ Erro ao atualizar último login:', error);
  }
}
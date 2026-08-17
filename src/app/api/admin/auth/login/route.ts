import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import twoFactorAuthService from '../../../../../services/twoFactorAuthService';
import { User, UserWithRole } from '../../../../../lib/database/users';
import { logLoginAttempt as logSecurityLoginAttempt, logSuspiciousActivity } from '../../../../../lib/monitoring/securityMonitor';
import { AUTH_CONFIG } from '@/lib/config/auth';
import { applyLoginRateLimit } from '@/lib/security/rate-limiter';
import { invalidateUser } from '@/lib/cache/cache-service';
import { getAuditConfigs } from '@/lib/database/userPermissions';

// O pool agora é importado centralizadamente de @/lib/database/connection
// para evitar o erro de 'too_many_connections' por excesso de instâncias.

interface LoginRequest {
  username: string;
  password: string;
  twoFactorCode?: string;
  tenantId?: string;
  userId?: string;
  selectedSegmentId?: string;
  isCRM?: boolean;
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
  reason?: string,
  tenantId?: string | null
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
        tenant_id,
        created_at
      ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    `, [
      userId,
      username,
      action,
      ipAddress,
      userAgent,
      twoFaUsed,
      action === 'login' || action === '2fa_success',
      reason || null,
      tenantId || null
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
        tenant_id
      ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8)
    `, [
      userId,
      auditAction,
      'AUTH',
      null,
      JSON.stringify({ username, two_fa_used: twoFaUsed, reason: reason || null }),
      ipAddress,
      userAgent,
      tenantId || null
    ]);
  } catch (error) {
    console.error('🚨 [CRITICAL_ERROR] Erro ao registrar log de login/audit_logs:', error);
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

    // ✔️ Rate Limiting: bloqueia ataques de força bruta por IP
    const rateLimitResponse = await applyLoginRateLimit(request);
    if (rateLimitResponse) return rateLimitResponse;

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
        u.two_fa_enabled, u.isencao, u.tipo_corretor, u.require_password_change,
        ur.name as role_name, ur.description as role_description, ur.level as role_level, ur.is_system_role
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
        await logLoginAttempt(client, null, username, 'login_failed', ipAddress, userAgent, false, 'Usuário não encontrado', body.tenantId);
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

    const user: UserWithRole = userResult.rows[0];

    // Mapear campo do banco para compatibilidade com interface
    user.two_factor_enabled = user.two_fa_enabled;

    // 2. Verificar se conta está ativa
    if (!user.is_active) {
      const client = await pool.connect();
      try {
        await logLoginAttempt(client, user.id, username, 'login_failed', ipAddress, userAgent, false, 'Conta desativada', body.tenantId);
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
    console.log('🔍 [LOGIN] Senha confere?', passwordMatch);

    if (!passwordMatch) {
      // Log tentativa de login com senha incorreta
      const client = await pool.connect();
      try {
        await logLoginAttempt(client, user.id, username, 'login_failed', ipAddress, userAgent, false, 'Senha incorreta', body.tenantId);
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

    // 5. Verificar vínculos de Multi-tenancia
    const tenantsQuery = `
      SELECT t.id, t.name, t.slug, s.name as segment_name, t.logo, t.logo_url, t.logo_mime_type
      FROM tenants t
      JOIN user_tenant_membership utm ON t.id = utm.tenant_id
      LEFT JOIN system_segments s ON t.segment_id = s.id
      WHERE utm.user_id = $1 AND utm.is_active = true
    `;
    const tenantsResult = await pool.query(tenantsQuery, [user.id]);
    const userTenants = tenantsResult.rows;

    let selectedTenantId = body.tenantId || (userTenants.length === 1 ? userTenants[0].id : null);
    console.log('🔍 [LOGIN] Tenant selecionado:', selectedTenantId);

    if (userTenants.length === 0) {
      // 🚀 ATUALIZAÇÃO PONTO ZERO: Se for o Dono da Plataforma, ele tem passe livre mesmo sem ter inquilinos.
      if (!user.is_system_role) {
        return NextResponse.json(
          { success: false, message: 'Usuário não possui vínculo ativo com nenhuma empresa' },
          { status: 403 }
        );
      } else {
        console.log('🛡️ MASTER ZERO POINT - Plataforma sem inquilinos. Concedendo acesso matriz ao Administrador Master.');
      }
    }

    // VISÃO AGNÓSTICA: Gestão de Contexto para Administrador Master
    if (user.is_system_role && !selectedTenantId) {
       console.log('🛡️ MASTER VISION - Administrador Master autenticado. Autolocalizando contexto Master.');
       
       // Tentar encontrar o Tenant Master (All Business)
       const masterTenantRes = await pool.query("SELECT id, name, slug FROM tenants WHERE slug = 'all-business-master' OR name ILIKE '%Master Platform%' LIMIT 1");
       
       if (masterTenantRes.rows.length > 0) {
          const masterTenant = masterTenantRes.rows[0];
          selectedTenantId = masterTenant.id;
          console.log('✅ Contexto Master Automático:', masterTenant.slug);
       } else {
          console.log('🛡️ MASTER GLOBAL ACCESS - Master Tenant não encontrado. Prosseguindo com visão global desacoplada.');
       }
    }

    // Fluxo Padrão (Empresas) para usuários comuns
    if (userTenants.length > 1 && !body.tenantId) {
      // 🚀 ATUALIZAÇÃO: Converter logos para base64 para o seletor de empresas
      const formattedTenants = userTenants.map(t => ({
        ...t,
        logo: (() => {
          // Priority 1: logo_url (text/base64 string)
          if (t.logo_url) {
            if (t.logo_url.startsWith('data:image')) return t.logo_url;
            return t.logo_url;
          }
          // Priority 2: logo (bytea)
          if (!t.logo) return null;
          if (typeof t.logo === 'string' && t.logo.startsWith('data:image')) return t.logo;
          const buffer = Buffer.isBuffer(t.logo) ? t.logo : 
                        (typeof t.logo === 'string' && t.logo.startsWith('\\x')) ? 
                        Buffer.from(t.logo.substring(2), 'hex') : Buffer.from(t.logo);
          return `data:${t.logo_mime_type || 'image/png'};base64,${buffer.toString('base64')}`;
        })()
      }));

      return NextResponse.json({
        success: true,
        requiresTenantSelection: true,
        tenants: formattedTenants,
        user: { 
          id: user.id,
          role_level: user.role_level 
        }
      });
    }

    // Tenant selecionado (ou o único disponível)
    if (!selectedTenantId) {
      if (!user.is_system_role) {
        return NextResponse.json({ success: false, message: 'Nenhuma unidade disponível para este usuário' }, { status: 403 });
      } else {
        console.log('🛡️ MASTER ZERO POINT - Ignorando ausência de Tenant ID para o Administrador Master.');
      }
    }

    let selectedTenant = userTenants.find(t => t.id === selectedTenantId);

    // BYPASS DE MEMBRESIA PARA MASTER PLATFORM (Onipresença)
    if (!selectedTenant && user.is_system_role) {
       console.log('🛡️ MASTER GLOBAL ACCESS - Verificando contexto para Administrador Master (Tenant ou Segmento)');
       
       // 1. Tentar buscar como Tenant ID direto
       let globalTenantQuery = 'SELECT id, name, slug, logo, logo_url, logo_mime_type FROM tenants WHERE id = $1 AND status = \'active\'';
       let globalTenantResult = await pool.query(globalTenantQuery, [selectedTenantId]);
       
       if (globalTenantResult.rows.length > 0) {
          selectedTenant = globalTenantResult.rows[0];
       } else {
          // 2. Tentar resolver como Segmento ID (Buscar o Master Tenant ou o primeiro do segmento)
          // Adicionando cast explícito caso o driver não converta automaticamente
          const segmentIdForQuery = selectedTenantId; 
          
          const segmentTenantQueryFinal = `
            SELECT t.id, t.name, t.slug, t.logo, t.logo_url, t.logo_mime_type 
            FROM tenants t 
            WHERE t.segment_id = $1::uuid AND t.status = 'active'
            ORDER BY t.created_at ASC 
            LIMIT 1
          `;
          const finalRes = await pool.query(segmentTenantQueryFinal, [segmentIdForQuery]);
          if (finalRes.rows.length > 0) {
             selectedTenant = finalRes.rows[0];
             console.log('✅ Contexto resolvido via Segmento -> Tenant:', selectedTenant.slug);
          }
       }
    }


    if (!selectedTenant) {
      if (!user.is_system_role) {
        return NextResponse.json({ success: false, message: 'Unidade selecionada inválida ou inativa' }, { status: 403 });
      } else {
        console.log('🛡️ MASTER ZERO POINT - Prosseguindo sem Unidade Selecionada (Contexto Desacoplado).');
      }
    }

    // 🚀 ATUALIZAÇÃO DE CONTEXTO OBRIGATÓRIA: Buscar o Cargo REAL do usuário dentro desta empresa
    const roleContextRes = await pool.query(`
      SELECT ur.name as role_name, ur.description as role_description, ur.level as role_level, ur.is_system_role
      FROM user_tenant_membership utm
      JOIN user_roles ur ON utm.role_id = ur.id
      WHERE utm.user_id = $1::uuid AND utm.tenant_id = $2::uuid
    `, [user.id, selectedTenantId]);

    console.log(`🔍 [LOGIN_ROLE_DEBUG] Resolving roles for user.id: ${user.id} (${typeof user.id})`);
    
    if (roleContextRes.rows.length > 0) {
      const tenantRole = roleContextRes.rows[0];
      user.role_name = tenantRole.role_name;
      user.role_description = tenantRole.role_description;
      user.role_level = tenantRole.role_level;
      (user as any).is_system_role = tenantRole.is_system_role;
      console.log(`✅ [LOGIN_ROLE_DEBUG] Tenant role found: ${user.role_name}`);
    } else {
      console.log(`🔍 [LOGIN_ROLE_DEBUG] No tenant role. Searching global role for user.id: ${user.id}...`);
      
      const globalRoleRes = await pool.query(`
        SELECT ur.name as role_name, ur.description as role_description, ur.level as role_level, ur.is_system_role
        FROM user_role_assignments ura
        JOIN user_roles ur ON ura.role_id = ur.id
        WHERE ura.user_id = $1::uuid
        ORDER BY ur.level DESC
        LIMIT 1
      `, [user.id]);

      if (globalRoleRes.rows.length > 0) {
        const globalRole = globalRoleRes.rows[0];
        user.role_name = globalRole.role_name;
        user.role_description = globalRole.role_description;
        user.role_level = globalRole.role_level;
        (user as any).is_system_role = globalRole.is_system_role;
        console.log(`🛡️ [LOGIN_ROLE_DEBUG] Global role found: ${user.role_name} (Level: ${user.role_level})`);
      } else {
        // Tenta buscar pelo username se o ID falhou (última tentativa de resgate do admin)
        console.log(`⚠️ [LOGIN_ROLE_DEBUG] Still no role. Final rescue attempt via username: ${user.username}...`);
        const rescueRes = await pool.query(`
          SELECT ur.name as role_name, ur.level as role_level
          FROM users u
          JOIN user_role_assignments ura ON u.id = ura.user_id
          JOIN user_roles ur ON ura.role_id = ur.id
          WHERE u.username = $1
          LIMIT 1
        `, [user.username]);

        if (rescueRes.rows.length > 0) {
          user.role_name = rescueRes.rows[0].role_name;
          user.role_level = rescueRes.rows[0].role_level;
          console.log(`🚀 [LOGIN_ROLE_DEBUG] Rescue success! Role: ${user.role_name}`);
        } else {
          console.warn(`❌ [LOGIN_ROLE_DEBUG] TOTAL FAIL: User has NO roles attached.`);
          user.role_name = 'Usuário';
          user.role_level = 1;
        }
      }
    }


    // 6. Verificar se 2FA está habilitado
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
            userAgent,
            selectedTenantId
          );

          if (codeSent) {
            // Log que 2FA foi requerido
            const client = await pool.connect();
            try {
              await logLoginAttempt(client, user.id, username, '2fa_required', ipAddress, userAgent, false, 'Código 2FA enviado por email', selectedTenantId);
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
          'email',
          selectedTenantId
        );

        if (!validationResult.valid) {
          const client = await pool.connect();
          try {
            await logLoginAttempt(client, user.id, username, '2fa_failed', ipAddress, userAgent, true, validationResult.message, selectedTenantId);
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
          await logLoginAttempt(client, user.id, username, '2fa_success', ipAddress, userAgent, true, 'Código 2FA validado com sucesso', selectedTenantId);
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
          WHEN p.action = 'write' THEN 'UPDATE'
          WHEN p.action = 'create' THEN 'CREATE'
          WHEN p.action = 'execute' THEN 'EXECUTE'
          WHEN p.action = 'read' OR p.action = 'list' THEN 'READ'
          ELSE p.action
        END as permission_level
      FROM users u
      JOIN user_tenant_membership utm ON u.id = utm.user_id AND utm.tenant_id = $2
      JOIN user_roles ur ON utm.role_id = ur.id
      JOIN role_permissions rp ON ur.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      JOIN system_features sf ON p.feature_id = sf.id
      LEFT JOIN system_categorias sc ON sf.category_id = sc.id
      WHERE u.id = $1 
        AND u.ativo = true
        AND ur.is_active = true
        AND sf.is_active = true
      ORDER BY sc.sort_order, p.action
    `;

    console.log('🔍 DEBUG LOGIN - Executando query de permissões para usuário ID:', user.id);

    let permissionsMap: { [key: string]: string } = {};

    try {
      const permissionsResult = await pool.query(permissionsQuery, [user.id, selectedTenantId]);
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

      // 7.1 BYPASS DE SISTEMA NO MAPA DE PERMISSÕES
      // Se o usuário possui role de sistema (Global Master), ele ganha 'ADMIN' em TODAS as features ativas
      const isSystemAdmin = user.is_system_role === true;

      if (isSystemAdmin) {
        console.log('🛡️ MASTER BYPASS - Populando mapa de permissões total via System Role');
        const allFeaturesQuery = 'SELECT slug FROM system_features WHERE is_active = true';
        const allFeaturesResult = await pool.query(allFeaturesQuery);
        allFeaturesResult.rows.forEach((f: any) => {
          permissionsMap[f.slug] = 'ADMIN';
        });
      }

      // 7.2 BYPASS DE TENANT ADMIN — role.name contém 'admin': ADMIN em todas as features provisionadas
      // Bypassa role_permissions mas RESPEITA tenant_feature_overrides (soberania do Master)
      if (!isSystemAdmin && selectedTenantId && (user.role_name || '').toLowerCase().includes('admin')) {
        console.log(`🏢 Tenant Admin detectado no login (role: "${user.role_name}") — Concedendo ADMIN nas features provisionadas`);
        const provisionedFeaturesQuery = `
          SELECT sf.slug
          FROM tenant_feature_overrides tfo
          JOIN system_features sf ON tfo.feature_id = sf.id
          WHERE tfo.tenant_id = $1 AND tfo.is_active = true AND sf.is_active = true
        `;
        const provisionedResult = await pool.query(provisionedFeaturesQuery, [selectedTenantId]);
        provisionedResult.rows.forEach((f: any) => {
          permissionsMap[f.slug] = 'ADMIN';
        });
        console.log(`✅ [Tenant Admin Login] ${provisionedResult.rows.length} features com ADMIN concedidas`);
      }

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

    // 🛡️ NOVO: Buscar Configurações de Auditoria (Soberania do Master)
    const auditConfigs = await getAuditConfigs(selectedTenantId);

    // Gerar token JWT com as informações básicas e permissões
    const jwtPayload = {
      userId: user.id,
      username: user.username,
      nome: user.nome,
      email: user.email,
      role_name: user.role_name || 'Usuário',
      role_level: user.role_level || 1,
      is_system_role: user.is_system_role === true,
      tenantId: selectedTenantId,
      tenantSlug: selectedTenant ? selectedTenant.slug : 'master-platform',
      is2FAEnabled: is2FAEnabled,
      permissoes: permissionsMap,
      auditConfigs: auditConfigs
    };

    console.log('🔍 DEBUG LOGIN - Token Payload:', JSON.stringify(jwtPayload, null, 2));

    const token = jwt.sign(jwtPayload, jwtSecret, {
      expiresIn: AUTH_CONFIG.JWT.ACCESS_TOKEN_EXPIRES_IN || '24h'
    } as SignOptions);

    // 8. Criar sessão no banco
    const sessionId = await createUserSession(user.id, ipAddress, userAgent);

    // 9. Log login bem-sucedido
    const client = await pool.connect();
    try {
      await logLoginAttempt(client, user.id, username, 'login', ipAddress, userAgent, is2FAEnabled, undefined, selectedTenantId);
    } finally {
      client.release();
    }

    // Log no sistema de monitoramento de segurança
    logSecurityLoginAttempt(ipAddress, userAgent, true, user.id);

    // 10. Retornar resposta de sucesso com estrutura plana para o frontend
    const rawFoto = (user as any).foto
    const rawFotoMime = (user as any).foto_tipo_mime || null
    let fotoBase64: string | null = null

    if (rawFoto) {
      try {
        if (Buffer.isBuffer(rawFoto)) {
          fotoBase64 = rawFoto.toString('base64')
        } else if (typeof rawFoto === 'string' && rawFoto.startsWith('\\x')) {
          fotoBase64 = Buffer.from(rawFoto.slice(2), 'hex').toString('base64')
        } else if (rawFoto instanceof Uint8Array) {
          fotoBase64 = Buffer.from(rawFoto).toString('base64')
        }
      } catch (e) {
        console.error('Erro ao converter foto:', e);
      }
    }

    const responseData = {
      success: true,
      message: 'Login realizado com sucesso',
      token,
      sessionId,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nome: user.nome,
        foto: fotoBase64,
        foto_tipo_mime: rawFotoMime,
        is2FAEnabled,
        role_name: user.role_name || '', 
        role_level: user.role_level || 0,
        is_system_role: user.is_system_role || false,
        require_password_change: !!user.require_password_change,
        auditConfigs: auditConfigs,
        currentTenant: selectedTenant ? {
          id: selectedTenant.id,
          name: selectedTenant.name,
          slug: selectedTenant.slug,
          logo: (() => {
            // Priority 1: logo_url (text/base64 string)
            if (selectedTenant.logo_url) {
              if (selectedTenant.logo_url.startsWith('data:image')) return selectedTenant.logo_url;
              return selectedTenant.logo_url;
            }
            // Priority 2: logo (bytea)
            if (!selectedTenant.logo) return null;
            if (typeof selectedTenant.logo === 'string' && selectedTenant.logo.startsWith('data:image')) return selectedTenant.logo;
            const buffer = Buffer.isBuffer(selectedTenant.logo) ? selectedTenant.logo : 
                          (typeof selectedTenant.logo === 'string' && selectedTenant.logo.startsWith('\\x')) ? 
                          Buffer.from(selectedTenant.logo.substring(2), 'hex') : Buffer.from(selectedTenant.logo);
            return `data:${selectedTenant.logo_mime_type || 'image/png'};base64,${buffer.toString('base64')}`;
          })()
        } : null
      }
    };

    const response = NextResponse.json(responseData);

    // Set HTTP-only cookie
    response.cookies.set('admin_auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });

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
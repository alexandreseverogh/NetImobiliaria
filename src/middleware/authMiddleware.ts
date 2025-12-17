import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import twoFactorAuthService from '../services/twoFactorAuthService';

// Configuração do pool de conexão
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'net_imobiliaria',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Roberto@2007',
});

interface AuthenticatedUser {
  userId: number;
  username: string;
  email: string;
  is2FAEnabled: boolean;
  sessionId?: string;
}

interface AuthMiddlewareOptions {
  require2FA?: boolean;
  requirePermissions?: string[];
  allowedRoles?: string[];
}

export function createAuthMiddleware(options: AuthMiddlewareOptions = {}) {
  return async function authMiddleware(request: NextRequest): Promise<NextResponse | null> {
    try {
      // Verificar token de autenticação
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { success: false, message: 'Token de autenticação necessário' },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);
      const jwtSecret = process.env.JWT_SECRET || 'fallback-secret';
      
      let decoded: any;
      try {
        decoded = jwt.verify(token, jwtSecret);
      } catch (error) {
        return NextResponse.json(
          { success: false, message: 'Token inválido ou expirado' },
          { status: 401 }
        );
      }

      const userId = decoded.userId;

      // Verificar se usuário existe e está ativo
      const userQuery = `
        SELECT u.id, u.username, u.email, u.is_active,
               ura.role_id, ur.name as role_name
        FROM users u
        LEFT JOIN user_role_assignments ura ON u.id = ura.user_id
        LEFT JOIN user_roles ur ON ura.role_id = ur.id
        WHERE u.id = $1
      `;
      
      const userResult = await pool.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Usuário não encontrado' },
          { status: 401 }
        );
      }

      const user = userResult.rows[0];
      
      if (!user.is_active) {
        return NextResponse.json(
          { success: false, message: 'Usuário desativado' },
          { status: 401 }
        );
      }

      // Verificar sessão (se sessionId estiver presente)
      if (decoded.sessionId) {
        const sessionQuery = `
          SELECT expires_at 
          FROM user_sessions 
          WHERE session_id = $1 AND user_id = $2 AND expires_at > NOW()
        `;
        
        const sessionResult = await pool.query(sessionQuery, [decoded.sessionId, userId]);
        
        if (sessionResult.rows.length === 0) {
          return NextResponse.json(
            { success: false, message: 'Sessão expirada' },
            { status: 401 }
          );
        }
      }

      // Verificar 2FA se necessário
      if (options.require2FA) {
        const is2FAEnabled = await twoFactorAuthService.is2FAEnabled(userId);
        
        if (is2FAEnabled && !decoded.twoFAVerified) {
          return NextResponse.json(
            { 
              success: false, 
              message: 'Verificação 2FA necessária',
              requires2FA: true
            },
            { status: 403 }
          );
        }
      }

      // Verificar permissões se especificadas
      if (options.requirePermissions && options.requirePermissions.length > 0) {
        const hasPermission = await checkUserPermissions(userId, options.requirePermissions);
        
        if (!hasPermission) {
          return NextResponse.json(
            { success: false, message: 'Permissões insuficientes' },
            { status: 403 }
          );
        }
      }

      // Verificar roles se especificadas
      if (options.allowedRoles && options.allowedRoles.length > 0) {
        const userRole = user.role_name;
        
        if (!userRole || !options.allowedRoles.includes(userRole)) {
          return NextResponse.json(
            { success: false, message: 'Role insuficiente' },
            { status: 403 }
          );
        }
      }

      // Adicionar informações do usuário à requisição
      const authenticatedUser: AuthenticatedUser = {
        userId: user.id,
        username: user.username,
        email: user.email,
        is2FAEnabled: decoded.is2FAEnabled || false,
        sessionId: decoded.sessionId
      };

      // Adicionar ao header da requisição para uso posterior
      request.headers.set('x-user-data', JSON.stringify(authenticatedUser));

      return null; // Continuar para o próximo middleware/handler

    } catch (error) {
      console.error('❌ Erro no middleware de autenticação:', error);
      
      return NextResponse.json(
        { success: false, message: 'Erro interno do servidor' },
        { status: 500 }
      );
    }
  };
}

// Função auxiliar para verificar permissões
async function checkUserPermissions(userId: number, requiredPermissions: string[]): Promise<boolean> {
  try {
    const permissionQuery = `
      SELECT p.action, sf.name as feature_name
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      JOIN user_role_assignments ura ON rp.role_id = ura.role_id
      JOIN system_features sf ON p.feature_id = sf.id
      WHERE ura.user_id = $1
      AND p.action = ANY($2)
    `;
    
    const result = await pool.query(permissionQuery, [userId, requiredPermissions]);
    
    // Verificar se o usuário tem todas as permissões necessárias
    const userPermissions = result.rows.map(row => row.action);
    return requiredPermissions.every(permission => userPermissions.includes(permission));
    
  } catch (error) {
    console.error('❌ Erro ao verificar permissões:', error);
    return false;
  }
}

// Middleware específico para APIs administrativas
export const adminAuthMiddleware = createAuthMiddleware({
  require2FA: true,
  allowedRoles: ['Super Admin', 'Administrador']
});

// Middleware para APIs que requerem 2FA
export const twoFAMiddleware = createAuthMiddleware({
  require2FA: true
});

// Middleware básico de autenticação
export const basicAuthMiddleware = createAuthMiddleware();

// Função para extrair dados do usuário da requisição
export function getAuthenticatedUser(request: NextRequest): AuthenticatedUser | null {
  try {
    const userData = request.headers.get('x-user-data');
    return userData ? JSON.parse(userData) : null;
  } catch (error) {
    console.error('❌ Erro ao extrair dados do usuário:', error);
    return null;
  }
}

// Middleware para verificar se usuário é Super Admin
export const superAdminMiddleware = createAuthMiddleware({
  require2FA: true,
  allowedRoles: ['Super Admin']
});



// Serviço de autenticação para a área administrativa
import { AdminUser, LoginCredentials, AuthResult, Session, Tenant } from '@/lib/types/admin'
import * as UserDatabase from '@/lib/database/users'
import pool from '@/lib/database/connection'
import bcrypt from 'bcryptjs'

export class AuthService {
  private static sessions: Map<string, Session> = new Map()
  
  // Login do usuário
  static async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      // Buscar usuário por username
      const user = await UserDatabase.findUserByUsername(credentials.username)
      
      if (!user || !user.ativo) {
        return {
          success: false,
          error: 'Usuário não encontrado ou inativo'
        }
      }
      
      // Verificar senha (bcrypt)
      const isPasswordValid = await bcrypt.compare(credentials.password, user.password)
      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Senha incorreta'
        }
      }

      // Buscar vínculos do usuário (Tenants)
      const tenantsQuery = `
        SELECT t.id, t.name, t.slug, t.segment
        FROM tenants t
        JOIN user_tenant_membership utm ON t.id = utm.tenant_id
        WHERE utm.user_id = $1 AND utm.is_active = true
      `
      const tenantsResult = await pool.query(tenantsQuery, [user.id])
      const tenants: Tenant[] = tenantsResult.rows

      if (tenants.length === 0) {
        return {
          success: false,
          error: 'Usuário não possui vínculo ativo com nenhuma empresa'
        }
      }

      // Se possui mais de um Tenant, interrompe e pede seleção
      if (tenants.length > 1) {
        return {
          success: true,
          requiresTenantSelection: true,
          tenants,
          user: { id: user.id } as AdminUser // Passando o ID para o front
        }
      }

      // Se possui apenas 1, finaliza o login automaticamente para aquele Tenant
      return this.completeLogin(user.id, tenants[0].id)
    } catch (error) {
      console.error('Erro no login:', error)
      return {
        success: false,
        error: 'Erro interno do servidor'
      }
    }
  }

  // Finaliza o login após seleção (ou automático para 1 tenant)
  static async completeLogin(userId: string, tenantId: string): Promise<AuthResult> {
    try {
      // Validar vínculo
      const membershipQuery = `
        SELECT utm.*, ur.name as role_name, ur.level as role_level, t.name as tenant_name, t.slug as tenant_slug, t.segment as tenant_segment
        FROM user_tenant_membership utm
        JOIN user_roles ur ON utm.role_id = ur.id
        JOIN tenants t ON utm.tenant_id = t.id
        WHERE utm.user_id = $1 AND utm.tenant_id = $2 AND utm.is_active = true
      `
      const result = await pool.query(membershipQuery, [userId, tenantId])
      const membership = result.rows[0]

      if (!membership) {
        return { success: false, error: 'Acesso negado para esta empresa' }
      }

      // Buscar dados básicos do usuário
      const user = await UserDatabase.findUserById(userId)
      if (!user) return { success: false, error: 'Usuário inválido' }

      // TODO: Buscar permissões dinâmicas do usuário para este tenant/role
      // Por enquanto vamos usar o mock de permissões ou manter o que existe
      const adminUser: AdminUser = {
        id: user.id,
        username: user.username,
        nome: user.nome,
        email: user.email,
        status: user.ativo ? 'ATIVO' : 'INATIVO',
        role_name: membership.role_name,
        role_level: membership.role_level,
        currentTenant: {
          id: membership.tenant_id,
          name: membership.tenant_name,
          slug: membership.tenant_slug,
          segment: membership.tenant_segment
        },
        permissoes: {} // Será preenchido pelo Pilar 3
      }

      const sessionId = this.generateSessionId()
      const session: Session = {
        id: sessionId,
        userId: user.id,
        user: adminUser,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }

      this.sessions.set(sessionId, session)
      
      // Atualizar estatística de acesso no banco
      await pool.query('UPDATE user_tenant_membership SET last_access = NOW() WHERE user_id = $1 AND tenant_id = $2', [userId, tenantId])
      await UserDatabase.updateLastLogin(userId)

      return {
        success: true,
        user: adminUser,
        sessionId
      }
    } catch (error) {
      return { success: false, error: 'Erro ao finalizar sessão' }
    }
  }
  
  // Verificar sessão
  static async verifySession(sessionId: string): Promise<AdminUser | null> {
    try {
      const session = this.sessions.get(sessionId)
      
      if (!session) {
        return null
      }
      
      // Verificar se a sessão expirou
      if (new Date() > new Date(session.expiresAt)) {
        this.sessions.delete(sessionId)
        return null
      }
      
      // Atualizar último acesso
      session.user.ultimoAcesso = new Date().toISOString()
      
      return session.user
    } catch (error) {
      return null
    }
  }
  
  // Logout
  static async logout(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId)
  }
  
  // Verificar permissões
  static hasPermission(user: AdminUser, resource: string, action: string): boolean {
    const userPermissions = user.permissoes as any
    
    if (!userPermissions[resource]) {
      return false
    }
    
    const userPermission = userPermissions[resource]
    
    switch (action) {
      case 'READ':
        return ['READ', 'UPDATE', 'DELETE'].includes(userPermission)
      case 'UPDATE':
        return ['UPDATE', 'DELETE'].includes(userPermission)
      case 'DELETE':
        return userPermission === 'DELETE'
      default:
        return false
    }
  }
  
  // Gerar ID de sessão único
  private static generateSessionId(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15)
  }
  
  // Limpar sessões expiradas
  static cleanupExpiredSessions(): void {
    const now = new Date()
    for (const [sessionId, session] of Array.from(this.sessions.entries())) {
      if (now > new Date(session.expiresAt)) {
        this.sessions.delete(sessionId)
      }
    }
  }
  
  // Obter estatísticas de sessões
  static getSessionStats(): { total: number; active: number } {
    const total = this.sessions.size
    let active = 0
    const now = new Date()
    
    for (const session of Array.from(this.sessions.values())) {
      if (now <= new Date(session.expiresAt)) {
        active++
      }
    }
    
    return { total, active }
  }
}

// Limpar sessões expiradas a cada hora
setInterval(() => {
  AuthService.cleanupExpiredSessions()
}, 60 * 60 * 1000)







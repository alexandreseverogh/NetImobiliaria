// Serviço de autenticação para a área administrativa
import { AdminUser, LoginCredentials, AuthResult, Session } from '@/lib/types/admin'
import usersData from './users.json'

export class AuthService {
  private static sessions: Map<string, Session> = new Map()
  
  // Login do usuário
  static async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      // Buscar usuário por username ou email
      const user = usersData.users.find(u => 
        (u.username === credentials.username || u.email === credentials.username) && 
        u.ativo
      )
      
      if (!user) {
        return {
          success: false,
          error: 'Usuário não encontrado ou inativo'
        }
      }
      
      // Verificar senha (em produção, usar bcrypt.compare)
      // Por enquanto, senha padrão: "password123"
      if (credentials.password !== 'password123') {
        return {
          success: false,
          error: 'Senha incorreta'
        }
      }
      
      // Criar sessão
      const sessionId = this.generateSessionId()
      
      // Mapear usuário para AdminUser com todas as propriedades necessárias
      const adminUser: AdminUser = {
        id: user.id,
        username: user.username,
        nome: user.nome,
        email: user.email,
        permissoes: user.permissoes as any,
        status: user.ativo ? 'ATIVO' : 'INATIVO',
        ultimoAcesso: new Date().toISOString()
      }
      
      const session: Session = {
        id: sessionId,
        userId: user.id,
        user: adminUser,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 horas
      }
      
      this.sessions.set(sessionId, session)
      
      // Atualizar último acesso
      adminUser.ultimoAcesso = new Date().toISOString()
      
      return {
        success: true,
        user: adminUser,
        sessionId
      }
    } catch (error) {
      return {
        success: false,
        error: 'Erro interno do servidor'
      }
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







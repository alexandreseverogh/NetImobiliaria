interface AuditLog {
  timestamp: string
  action: string
  userId?: string
  username?: string
  ip?: string
  details: string
  success: boolean
}

class AuditLogger {
  private logs: AuditLog[] = []

  log(action: string, details: string, success: boolean, userId?: string, username?: string, ip?: string) {
    const logEntry: AuditLog = {
      timestamp: new Date().toISOString(),
      action,
      userId,
      username,
      ip,
      details,
      success
    }

    this.logs.push(logEntry)
    
    // Em produção, salvar em banco de dados ou arquivo
    console.log('🔍 AUDIT LOG:', logEntry)
  }

  logLogin(username: string, success: boolean, ip?: string) {
    this.log(
      'LOGIN_ATTEMPT',
      `Tentativa de login para usuário: ${username}`,
      success,
      undefined,
      username,
      ip
    )
  }

  logLogout(userId: string, username: string) {
    this.log(
      'LOGOUT',
      `Usuário fez logout`,
      true,
      userId,
      username
    )
  }

  logAction(action: string, userId: string, username: string, details: string) {
    this.log(
      action,
      details,
      true,
      userId,
      username
    )
  }

  getLogs(): AuditLog[] {
    return [...this.logs]
  }

  getLogsByUser(userId: string): AuditLog[] {
    return this.logs.filter(log => log.userId === userId)
  }

  getLogsByAction(action: string): AuditLog[] {
    return this.logs.filter(log => log.action === action)
  }
}

export const auditLogger = new AuditLogger()


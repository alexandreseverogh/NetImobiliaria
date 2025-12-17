// Sistema de logging profissional
// Substitui console.logs por sistema centralizado e configurável

import { LOGGING_CONFIG } from '@/lib/config/constants'

export type LogLevel = 'error' | 'warn' | 'info' | 'debug'

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: string
  data?: any
  userId?: string
  ip?: string
}

class Logger {
  private currentLevel: LogLevel
  private isDevelopment: boolean
  private isProduction: boolean

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development'
    this.isProduction = process.env.NODE_ENV === 'production'
    this.currentLevel = this.getLogLevel()
  }

  private getLogLevel(): LogLevel {
    const envLevel = process.env.LOG_LEVEL as LogLevel
    if (envLevel && LOGGING_CONFIG.LEVELS[envLevel as keyof typeof LOGGING_CONFIG.LEVELS]) {
      return envLevel
    }
    
    const envConfig = LOGGING_CONFIG.BY_ENVIRONMENT[process.env.NODE_ENV as keyof typeof LOGGING_CONFIG.BY_ENVIRONMENT]
    return envConfig as LogLevel || 'info'
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['error', 'warn', 'info', 'debug']
    const currentIndex = levels.indexOf(this.currentLevel)
    const messageIndex = levels.indexOf(level)
    
    return messageIndex <= currentIndex
  }

  private formatMessage(level: LogLevel, message: string, context?: string, data?: any): string {
    const timestamp = new Date().toISOString()
    const contextStr = context ? `[${context}]` : ''
    const dataStr = data ? ` | Data: ${JSON.stringify(data)}` : ''
    
    return `${timestamp} [${level.toUpperCase()}]${contextStr} ${message}${dataStr}`
  }

  private log(level: LogLevel, message: string, context?: string, data?: any, userId?: string, ip?: string): void {
    if (!this.shouldLog(level)) {
      return
    }

    const formattedMessage = this.formatMessage(level, message, context, data)
    
    // Em desenvolvimento, usar console com cores
    if (this.isDevelopment) {
      const colors = {
        error: '\x1b[31m', // Vermelho
        warn: '\x1b[33m',  // Amarelo
        info: '\x1b[36m',  // Ciano
        debug: '\x1b[37m'  // Branco
      }
      const reset = '\x1b[0m'
      
      console[level](`${colors[level]}${formattedMessage}${reset}`)
    } else {
      // Em produção, usar console sem cores
      console[level](formattedMessage)
    }

    // Em produção, também salvar em arquivo ou banco de dados
    if (this.isProduction && LOGGING_CONFIG.AUDIT.ENABLED) {
      this.saveToAuditLog(level, message, context, data, userId, ip)
    }
  }

  private async saveToAuditLog(
    level: LogLevel, 
    message: string, 
    context?: string, 
    data?: any, 
    userId?: string, 
    ip?: string
  ): Promise<void> {
    try {
      // Aqui você pode implementar salvamento em banco de dados
      // ou arquivo de log conforme necessário
      const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        context,
        data,
        userId,
        ip
      }
      
      // Por enquanto, apenas log no console
      // Em implementação futura, salvar em banco
      console.log('AUDIT_LOG:', JSON.stringify(logEntry))
    } catch (error) {
      // Não falhar se logging falhar
      console.error('Erro ao salvar log de auditoria:', error)
    }
  }

  // Métodos públicos
  error(message: string, context?: string, data?: any, userId?: string, ip?: string): void {
    this.log('error', message, context, data, userId, ip)
  }

  warn(message: string, context?: string, data?: any, userId?: string, ip?: string): void {
    this.log('warn', message, context, data, userId, ip)
  }

  info(message: string, context?: string, data?: any, userId?: string, ip?: string): void {
    this.log('info', message, context, data, userId, ip)
  }

  debug(message: string, context?: string, data?: any, userId?: string, ip?: string): void {
    this.log('debug', message, context, data, userId, ip)
  }

  // Métodos específicos para diferentes contextos
  api(message: string, data?: any, userId?: string, ip?: string): void {
    this.info(message, 'API', data, userId, ip)
  }

  database(message: string, data?: any, userId?: string, ip?: string): void {
    this.info(message, 'DATABASE', data, userId, ip)
  }

  auth(message: string, data?: any, userId?: string, ip?: string): void {
    this.info(message, 'AUTH', data, userId, ip)
  }

  business(message: string, data?: any, userId?: string, ip?: string): void {
    this.info(message, 'BUSINESS', data, userId, ip)
  }

  // Método para logs de performance
  performance(operation: string, duration: number, data?: any): void {
    this.info(`Performance: ${operation} took ${duration}ms`, 'PERFORMANCE', data)
  }

  // Método para logs de segurança
  security(event: string, data?: any, userId?: string, ip?: string): void {
    this.warn(`Security: ${event}`, 'SECURITY', data, userId, ip)
  }
}

// Instância singleton
export const logger = new Logger()

// Funções de conveniência para uso direto
export const logError = (message: string, context?: string, data?: any) => 
  logger.error(message, context, data)

export const logWarn = (message: string, context?: string, data?: any) => 
  logger.warn(message, context, data)

export const logInfo = (message: string, context?: string, data?: any) => 
  logger.info(message, context, data)

export const logDebug = (message: string, context?: string, data?: any) => 
  logger.debug(message, context, data)

export const logApi = (message: string, data?: any) => 
  logger.api(message, data)

export const logDatabase = (message: string, data?: any) => 
  logger.database(message, data)

export const logAuth = (message: string, data?: any) => 
  logger.auth(message, data)

export const logBusiness = (message: string, data?: any) => 
  logger.business(message, data)

export const logPerformance = (operation: string, duration: number, data?: any) => 
  logger.performance(operation, duration, data)

export const logSecurity = (event: string, data?: any, userId?: string, ip?: string) => 
  logger.security(event, data, userId, ip)

export default logger

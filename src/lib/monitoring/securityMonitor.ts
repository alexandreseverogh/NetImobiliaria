// Sistema de monitoramento de segurança em tempo real
// Detecta e registra atividades suspeitas

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: 'login_attempt' | 'login_attempt_failed' | 'rate_limit_exceeded' | 'invalid_input' | 'suspicious_activity' | 'system_error';
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  description: string;
  metadata?: Record<string, any>;
  details?: Record<string, any>;
  ipAddress?: string;
  ip_address?: string;
  userAgent?: string;
  user_agent?: string;
  userId?: string | number;
}

export interface SecurityAlert {
  id: string;
  eventId: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

class SecurityMonitor {
  private events: SecurityEvent[] = [];
  private alerts: SecurityAlert[] = [];
  private maxEvents: number = 1000;
  private alertThresholds: Record<string, number> = {
    'login_attempts_per_minute': 10,
    'rate_limit_exceeded_per_hour': 5,
    'invalid_inputs_per_hour': 20,
    'suspicious_activities_per_hour': 3
  };

  // Registrar evento de segurança
  logEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): void {
    const securityEvent: SecurityEvent = {
      id: this.generateId(),
      timestamp: new Date(),
      ...event,
      metadata: event.metadata ?? {},
      details: event.details ?? event.metadata ?? {},
      ipAddress: event.ipAddress ?? event.ip_address,
      ip_address: event.ip_address ?? event.ipAddress,
      userAgent: event.userAgent ?? event.user_agent,
      user_agent: event.user_agent ?? event.userAgent
    };

    this.events.push(securityEvent);
    
    // Manter apenas os últimos maxEvents
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Verificar se deve gerar alerta
    this.checkForAlerts(securityEvent);

    // Log no console para desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔒 Security Event: ${event.type} - ${event.description}`);
    }
  }

  // Verificar se deve gerar alerta
  private checkForAlerts(event: SecurityEvent): void {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Verificar tentativas de login excessivas
    if (event.type === 'login_attempt') {
      const recentLoginAttempts = this.events.filter(e => 
        e.type === 'login_attempt' && 
        e.timestamp > oneMinuteAgo &&
        e.ipAddress === event.ipAddress
      ).length;

      if (recentLoginAttempts >= this.alertThresholds.login_attempts_per_minute) {
        this.createAlert({
          eventId: event.id,
          severity: 'high',
          title: 'Múltiplas tentativas de login',
          description: `${recentLoginAttempts} tentativas de login em 1 minuto do IP ${event.ipAddress}`
        });
      }
    }

    // Verificar rate limiting excessivo
    if (event.type === 'rate_limit_exceeded') {
      const recentRateLimitExceeded = this.events.filter(e => 
        e.type === 'rate_limit_exceeded' && 
        e.timestamp > oneHourAgo &&
        e.ipAddress === event.ipAddress
      ).length;

      if (recentRateLimitExceeded >= this.alertThresholds.rate_limit_exceeded_per_hour) {
        this.createAlert({
          eventId: event.id,
          severity: 'medium',
          title: 'Rate limiting excessivo',
          description: `${recentRateLimitExceeded} excedências de rate limit em 1 hora do IP ${event.ipAddress}`
        });
      }
    }

    // Verificar entradas inválidas excessivas
    if (event.type === 'invalid_input') {
      const recentInvalidInputs = this.events.filter(e => 
        e.type === 'invalid_input' && 
        e.timestamp > oneHourAgo &&
        e.ipAddress === event.ipAddress
      ).length;

      if (recentInvalidInputs >= this.alertThresholds.invalid_inputs_per_hour) {
        this.createAlert({
          eventId: event.id,
          severity: 'medium',
          title: 'Múltiplas entradas inválidas',
          description: `${recentInvalidInputs} entradas inválidas em 1 hora do IP ${event.ipAddress}`
        });
      }
    }

    // Verificar atividades suspeitas
    if (event.type === 'suspicious_activity') {
      const recentSuspiciousActivities = this.events.filter(e => 
        e.type === 'suspicious_activity' && 
        e.timestamp > oneHourAgo &&
        e.ipAddress === event.ipAddress
      ).length;

      if (recentSuspiciousActivities >= this.alertThresholds.suspicious_activities_per_hour) {
        this.createAlert({
          eventId: event.id,
          severity: 'critical',
          title: 'Atividade suspeita detectada',
          description: `${recentSuspiciousActivities} atividades suspeitas em 1 hora do IP ${event.ipAddress}`
        });
      }
    }
  }

  // Criar alerta
  private createAlert(alert: Omit<SecurityAlert, 'id' | 'timestamp' | 'resolved'>): void {
    const securityAlert: SecurityAlert = {
      id: this.generateId(),
      timestamp: new Date(),
      resolved: false,
      ...alert
    };

    this.alerts.push(securityAlert);

    // Log no console para desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚨 Security Alert: ${alert.severity.toUpperCase()} - ${alert.title}`);
    }
  }

  // Obter eventos recentes
  getRecentEvents(limit: number = 50): SecurityEvent[] {
    return this.events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  // Obter eventos com filtros de data
  async getEvents(limit: number = 50, startDate?: string | null, endDate?: string | null): Promise<SecurityEvent[]> {
    // Buscar eventos do banco de dados
    const dbEvents = await this.getDatabaseEvents(startDate, endDate)
    
    // Combinar com eventos em memória
    const allEvents = [...this.events, ...dbEvents]
    
    // Filtrar por data se especificado
    let filteredEvents = allEvents
    if (startDate || endDate) {
      filteredEvents = allEvents.filter(event => {
        const eventDate = event.timestamp.toISOString().split('T')[0]
        if (startDate && eventDate < startDate) return false
        if (endDate && eventDate > endDate) return false
        return true
      })
    }
    
    return filteredEvents
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  private async getDatabaseEvents(startDate?: string | null, endDate?: string | null): Promise<SecurityEvent[]> {
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME!,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'Roberto@2007',
    });

    try {
      const client = await pool.connect();
      
      // Construir query com filtros de data
      let query = `
        SELECT 
          id,
          user_id,
          username,
          action,
          ip_address,
          user_agent,
          created_at
        FROM login_logs 
        WHERE 1=1
      `
      
      const params: any[] = []
      let paramCount = 0
      
      if (startDate) {
        paramCount++
        query += ` AND created_at >= $${paramCount}`
        params.push(startDate)
      }
      
      if (endDate) {
        paramCount++
        query += ` AND created_at <= $${paramCount}`
        params.push(endDate + ' 23:59:59')
      }
      
      query += ` ORDER BY created_at DESC LIMIT 1000`
      
      const result = await client.query(query, params)
      
      
      const events: SecurityEvent[] = result.rows.map((row: any) => {
        const isSuccess = row.action === 'login'
        const isFailed = row.action === 'login_failed'
        
        return {
          id: row.id,
          timestamp: new Date(row.created_at),
          type: isSuccess ? 'login_attempt' : 'login_attempt_failed' as const,
          severity: isSuccess ? 'low' : 'medium',
          source: 'auth',
          description: isSuccess ? 'Login bem-sucedido' : 'Tentativa de login falhada',
          metadata: { 
            success: isSuccess,
            userId: row.user_id,
            username: row.username
          },
          details: row.details || undefined,
          ipAddress: row.ip_address || undefined,
          ip_address: row.ip_address || undefined,
          userAgent: row.user_agent || undefined,
          user_agent: row.user_agent || undefined,
          userId: row.user_id ?? undefined
        }
      })

      client.release();
      return events;
    } catch (error) {
      console.error('Erro ao buscar eventos do banco:', error);
      return [];
    } finally {
      await pool.end();
    }
  }

  // Obter alertas ativos
  getActiveAlerts(): SecurityAlert[] {
    return this.alerts
      .filter(alert => !alert.resolved)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Obter estatísticas
  async getStats(): Promise<{
    totalEvents: number;
    recentAlerts: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
  }> {
    // Buscar dados do banco de dados
    const dbStats = await this.getDatabaseStats();
    
    // Combinar com dados em memória
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentEvents = this.events.filter(e => e.timestamp > oneHourAgo);

    const eventsByType: Record<string, number> = { ...dbStats.eventsByType };
    const eventsBySeverity: Record<string, number> = { ...dbStats.eventsBySeverity };

    // Adicionar eventos em memória
    recentEvents.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
    });

    return {
      totalEvents: dbStats.totalEvents + this.events.length,
      recentAlerts: this.alerts.filter(alert => !alert.resolved).length,
      eventsByType,
      eventsBySeverity
    };
  }

  private async getDatabaseStats(): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    eventsBySeverity: Record<string, number>;
  }> {
    const { Pool } = require('pg');
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME!,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'Roberto@2007',
    });

    try {
      const client = await pool.connect();
      
      // Buscar estatísticas dos logs de login
      const result = await client.query(`
        SELECT 
          COUNT(*) as total_events,
          action,
          CASE 
            WHEN action = 'login' THEN 'low'
            WHEN action = 'login_failed' THEN 'medium'
            WHEN action = '2fa_required' THEN 'low'
            WHEN action = '2fa_success' THEN 'low'
            WHEN action = '2fa_failed' THEN 'medium'
            ELSE 'low'
          END as severity
        FROM login_logs 
        WHERE created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY action, severity
      `);

      const eventsByType: Record<string, number> = {};
      const eventsBySeverity: Record<string, number> = {};
      let totalEvents = 0;

      result.rows.forEach((row: any) => {
        const count = parseInt(row.total_events);
        totalEvents += count;
        
        // Mapear action para tipo de evento
        const eventType = row.action === 'login' ? 'login_attempt' : 'login_attempt_failed';
        eventsByType[eventType] = (eventsByType[eventType] || 0) + count;
        eventsBySeverity[row.severity] = (eventsBySeverity[row.severity] || 0) + count;
      });

      client.release();
      return { totalEvents, eventsByType, eventsBySeverity };
    } catch (error) {
      console.error('Erro ao buscar estatísticas do banco:', error);
      return { totalEvents: 0, eventsByType: {}, eventsBySeverity: {} };
    } finally {
      await pool.end();
    }
  }

  // Resolver alerta
  resolveAlert(alertId: string, resolvedBy: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      alert.resolvedBy = resolvedBy;
      return true;
    }
    return false;
  }

  // Limpar eventos antigos
  clearOldEvents(olderThanHours: number = 24): void {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    this.events = this.events.filter(event => event.timestamp > cutoff);
  }

  // Gerar ID único
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Instância singleton
export const securityMonitor = new SecurityMonitor();

// Funções utilitárias para logging
export function logLoginAttempt(ipAddress: string, userAgent: string, success: boolean, userId?: string | number): void {
  securityMonitor.logEvent({
    type: 'login_attempt',
    severity: success ? 'low' : 'medium',
    source: 'auth',
    description: success ? 'Login bem-sucedido' : 'Tentativa de login falhada',
    metadata: { success, userId },
    ipAddress,
    userAgent
  });
}

export function logRateLimitExceeded(ipAddress: string, userAgent: string, endpoint: string): void {
  securityMonitor.logEvent({
    type: 'rate_limit_exceeded',
    severity: 'medium',
    source: 'rate_limit',
    description: `Rate limit excedido para ${endpoint}`,
    metadata: { endpoint },
    ipAddress,
    userAgent
  });
}

export function logInvalidInput(ipAddress: string, userAgent: string, endpoint: string, errors: string[]): void {
  securityMonitor.logEvent({
    type: 'invalid_input',
    severity: 'low',
    source: 'validation',
    description: `Entrada inválida em ${endpoint}`,
    metadata: { endpoint, errors },
    ipAddress,
    userAgent
  });
}

export function logSuspiciousActivity(ipAddress: string, userAgent: string, description: string, metadata: Record<string, any> = {}): void {
  securityMonitor.logEvent({
    type: 'suspicious_activity',
    severity: 'high',
    source: 'monitoring',
    description,
    metadata,
    ipAddress,
    userAgent
  });
}

export function logSystemError(error: Error, source: string, metadata: Record<string, any> = {}): void {
  securityMonitor.logEvent({
    type: 'system_error',
    severity: 'medium',
    source,
    description: error.message,
    metadata: { ...metadata, stack: error.stack }
  });
}

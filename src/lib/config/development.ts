// Configurações específicas para ambiente de desenvolvimento
export const DEVELOPMENT_CONFIG = {
  // Configurações de segurança relaxadas para desenvolvimento
  SECURITY: {
    // Cookies não seguros em desenvolvimento (HTTP)
    COOKIES_SECURE: false,

    // HTTPS desabilitado em desenvolvimento
    FORCE_HTTPS: false,

    // CORS mais permissivo em desenvolvimento
    CORS_STRICT: false,
    ALLOWED_ORIGINS: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001'
    ],

    // Headers de segurança mais flexíveis
    SECURITY_HEADERS: {
      'X-Frame-Options': 'SAMEORIGIN', // Mais permissivo que DENY
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-XSS-Protection': '1; mode=block',
    },

    // Rate limiting mais permissivo em desenvolvimento
    RATE_LIMIT: {
      LOGIN_ATTEMPTS: 10, // Mais tentativas em dev
      LOGIN_WINDOW: 5 * 60 * 1000, // 5 minutos em vez de 15
      BLOCK_DURATION: 5 * 60 * 1000, // 5 minutos em vez de 30
      API_REQUESTS: 1000, // Mais requests por minuto
      API_WINDOW: 60 * 1000, // 1 minuto
    },
  },

  // Configurações de 2FA relaxadas para desenvolvimento
  TWO_FACTOR: {
    // 2FA opcional em desenvolvimento
    REQUIRED: false,

    // Códigos de desenvolvimento (para testes)
    DEV_CODES: {
      ENABLED: true,
      VALID_CODES: ['123456', '000000', '111111'],
    },

    // Tempo de expiração mais longo em desenvolvimento
    CODE_EXPIRATION: 60 * 60 * 1000, // 1 hora em vez de 10 minutos

    // Email de desenvolvimento
    DEV_EMAIL: 'dev@localhost',
  },

  // Configurações de banco de dados para desenvolvimento
  DATABASE: {
    // Pool de conexões menor em desenvolvimento
    MAX_CONNECTIONS: 5,

    // Logs de query habilitados em desenvolvimento
    LOG_QUERIES: true,

    // Timeout mais longo para debugging
    QUERY_TIMEOUT: 30000, // 30 segundos
  },

  // Configurações de logging
  LOGGING: {
    // Logs mais verbosos em desenvolvimento
    LEVEL: 'debug',

    // Logs de SQL habilitados
    SQL_LOGS: true,

    // Logs de auditoria habilitados
    AUDIT_LOGS: true,

    // Console logs habilitados
    CONSOLE_LOGS: true,
  },

  // Configurações de sessão para desenvolvimento
  SESSION: {
    // Sessões mais longas em desenvolvimento
    TIMEOUT: 24 * 60 * 60 * 1000, // 24 horas

    // Refresh automático desabilitado para debugging
    AUTO_REFRESH: false,

    // Max sessões por usuário aumentado
    MAX_ACTIVE_SESSIONS: 10,
  },

  // Configurações de cache
  CACHE: {
    // Cache desabilitado em desenvolvimento para evitar problemas
    ENABLED: false,

    // TTL muito curto se habilitado
    TTL: 60 * 1000, // 1 minuto
  },

  // Configurações de upload
  UPLOAD: {
    // Tamanho máximo menor em desenvolvimento
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB

    // Tipos de arquivo mais permissivos
    ALLOWED_TYPES: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'application/json'
    ],
  },

  // Configurações de API
  API: {
    // Timeout mais longo para debugging
    TIMEOUT: 60000, // 60 segundos

    // Retry desabilitado para debugging
    RETRY_ENABLED: false,

    // Validação de entrada mais flexível
    STRICT_VALIDATION: false,
  },

  // Configurações de debug
  DEBUG: {
    // Debug habilitado
    ENABLED: true,

    // Informações detalhadas de erro
    DETAILED_ERRORS: true,

    // Stack traces completos
    FULL_STACK_TRACE: true,

    // Logs de performance
    PERFORMANCE_LOGS: true,
  },

  // Configurações de desenvolvimento específicas
  DEV_FEATURES: {
    // Hot reload habilitado
    HOT_RELOAD: true,

    // Source maps habilitados
    SOURCE_MAPS: true,

    // Redux DevTools habilitado
    REDUX_DEVTOOLS: true,

    // React DevTools habilitado
    REACT_DEVTOOLS: true,
  },
}

// Configurações específicas para ambiente de produção
export const PRODUCTION_CONFIG = {
  // Configurações de segurança rigorosas para produção
  SECURITY: {
    // Cookies seguros em produção (HTTPS)
    COOKIES_SECURE: true,

    // HTTPS obrigatório em produção
    FORCE_HTTPS: true,

    // CORS restritivo em produção
    CORS_STRICT: true,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || [],

    // Headers de segurança rigorosos
    SECURITY_HEADERS: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
    },

    // Rate limiting rigoroso em produção
    RATE_LIMIT: {
      LOGIN_ATTEMPTS: 5,
      LOGIN_WINDOW: 15 * 60 * 1000, // 15 minutos
      BLOCK_DURATION: 30 * 60 * 1000, // 30 minutos
      API_REQUESTS: 100,
      API_WINDOW: 15 * 60 * 1000, // 15 minutos
    },
  },

  // Configurações de 2FA rigorosas para produção
  TWO_FACTOR: {
    // 2FA obrigatório em produção
    REQUIRED: true,

    // Códigos de desenvolvimento desabilitados
    DEV_CODES: {
      ENABLED: false,
      VALID_CODES: [],
    },

    // Tempo de expiração padrão
    CODE_EXPIRATION: 10 * 60 * 1000, // 10 minutos

    // Email real
    DEV_EMAIL: null,
  },

  // Configurações de banco de dados para produção
  DATABASE: {
    // Pool de conexões otimizado para produção
    MAX_CONNECTIONS: 20,

    // Logs de query desabilitados em produção
    LOG_QUERIES: false,

    // Timeout padrão
    QUERY_TIMEOUT: 10000, // 10 segundos
  },

  // Configurações de logging
  LOGGING: {
    // Logs mínimos em produção
    LEVEL: 'error',

    // Logs de SQL desabilitados
    SQL_LOGS: false,

    // Logs de auditoria habilitados
    AUDIT_LOGS: true,

    // Console logs desabilitados
    CONSOLE_LOGS: false,
  },

  // Configurações de sessão para produção
  SESSION: {
    // Sessões padrão
    TIMEOUT: 24 * 60 * 60 * 1000, // 24 horas

    // Refresh automático habilitado
    AUTO_REFRESH: true,

    // Max sessões por usuário padrão
    MAX_ACTIVE_SESSIONS: 5,
  },

  // Configurações de cache
  CACHE: {
    // Cache habilitado em produção
    ENABLED: true,

    // TTL padrão
    TTL: 5 * 60 * 1000, // 5 minutos
  },

  // Configurações de upload
  UPLOAD: {
    // Tamanho máximo padrão
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB

    // Tipos de arquivo restritivos
    ALLOWED_TYPES: [
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/pdf'
    ],
  },

  // Configurações de API
  API: {
    // Timeout padrão
    TIMEOUT: 30000, // 30 segundos

    // Retry habilitado
    RETRY_ENABLED: true,

    // Validação de entrada rigorosa
    STRICT_VALIDATION: true,
  },

  // Configurações de debug
  DEBUG: {
    // Debug desabilitado
    ENABLED: false,

    // Informações mínimas de erro
    DETAILED_ERRORS: false,

    // Stack traces limitados
    FULL_STACK_TRACE: false,

    // Logs de performance desabilitados
    PERFORMANCE_LOGS: false,
  },

  // Configurações de produção específicas
  PROD_FEATURES: {
    // Hot reload desabilitado
    HOT_RELOAD: false,

    // Source maps desabilitados
    SOURCE_MAPS: false,

    // Redux DevTools desabilitado
    REDUX_DEVTOOLS: false,

    // React DevTools desabilitado
    REACT_DEVTOOLS: false,
  },
}

// Função para obter configurações baseadas no ambiente
export function getEnvironmentConfig() {
  const isDevelopment = process.env.NODE_ENV === 'development'
  const isProduction = process.env.NODE_ENV === 'production'

  if (isDevelopment) {
    return {
      ...DEVELOPMENT_CONFIG,
      ENVIRONMENT: 'development'
    }
  }

  if (isProduction) {
    return {
      ...PRODUCTION_CONFIG,
      ENVIRONMENT: 'production'
    }
  }

  // Fallback para outros ambientes (test, etc.)
  return {
    ...DEVELOPMENT_CONFIG,
    ENVIRONMENT: process.env.NODE_ENV || 'development'
  }
}

// Exportar configurações atuais
export const ENV_CONFIG = getEnvironmentConfig()



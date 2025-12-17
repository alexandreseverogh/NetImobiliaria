import { getEnvironmentConfig } from './development'

// Obter configurações baseadas no ambiente
const envConfig = getEnvironmentConfig()

// Configurações centralizadas de autenticação
export const AUTH_CONFIG = {
  // Configurações JWT
  JWT: {
    SECRET: process.env.JWT_SECRET || 'sua-chave-secreta-super-segura-aqui',
    ACCESS_TOKEN_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
    REFRESH_TOKEN_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  // Configurações de cookies (baseadas no ambiente)
  COOKIES: {
    ACCESS_TOKEN_NAME: 'accessToken',
    REFRESH_TOKEN_NAME: 'refreshToken',
    HTTP_ONLY: true,
    SECURE: envConfig.SECURITY.COOKIES_SECURE,
    SAME_SITE: 'strict' as const,
    PATH: '/',
  },
  
  // Configurações de senha
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
    SALT_ROUNDS: 12,
  },
  
  // Configurações de sessão (baseadas no ambiente)
  SESSION: {
    MAX_ACTIVE_SESSIONS: envConfig.SESSION.MAX_ACTIVE_SESSIONS,
    SESSION_TIMEOUT: envConfig.SESSION.TIMEOUT,
  },
  
  // Rotas protegidas
  PROTECTED_ROUTES: [
    '/admin',
    '/api/admin',
  ],
  
  // Rotas de autenticação
  AUTH_ROUTES: [
    '/admin/login',
  ],
  
  // Configurações de rate limiting (baseadas no ambiente)
  RATE_LIMIT: {
    LOGIN_ATTEMPTS: envConfig.SECURITY.RATE_LIMIT.LOGIN_ATTEMPTS,
    LOGIN_WINDOW: envConfig.SECURITY.RATE_LIMIT.LOGIN_WINDOW,
    BLOCK_DURATION: envConfig.SECURITY.RATE_LIMIT.BLOCK_DURATION,
    API_REQUESTS: envConfig.SECURITY.RATE_LIMIT.API_REQUESTS,
    API_WINDOW: envConfig.SECURITY.RATE_LIMIT.API_WINDOW,
  },
}

// Configurações de ambiente (usando configurações dinâmicas)
export const ENV_CONFIG = {
  NODE_ENV: envConfig.ENVIRONMENT,
  IS_PRODUCTION: envConfig.ENVIRONMENT === 'production',
  IS_DEVELOPMENT: envConfig.ENVIRONMENT === 'development',
  IS_TEST: envConfig.ENVIRONMENT === 'test',
}

// Configurações de segurança (baseadas no ambiente)
export const SECURITY_CONFIG = {
  // Headers de segurança (baseados no ambiente)
  SECURITY_HEADERS: envConfig.SECURITY.SECURITY_HEADERS,
  
  // Configurações CORS (baseadas no ambiente)
  CORS: {
    ALLOWED_ORIGINS: envConfig.SECURITY.ALLOWED_ORIGINS,
    ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    ALLOWED_HEADERS: ['Content-Type', 'Authorization'],
    CREDENTIALS: true,
  },
}



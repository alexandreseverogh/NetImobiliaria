// Configurações centralizadas de autenticação
export const AUTH_CONFIG = {
  // Configurações JWT
  JWT: {
    SECRET: process.env.JWT_SECRET || 'sua-chave-secreta-super-segura-aqui',
    ACCESS_TOKEN_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
    REFRESH_TOKEN_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  
  // Configurações de cookies
  COOKIES: {
    ACCESS_TOKEN_NAME: 'accessToken',
    REFRESH_TOKEN_NAME: 'refreshToken',
    HTTP_ONLY: true,
    SECURE: process.env.NODE_ENV === 'production',
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
  
  // Configurações de sessão
  SESSION: {
    MAX_ACTIVE_SESSIONS: 5,
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutos
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
  
  // Configurações de rate limiting
  RATE_LIMIT: {
    LOGIN_ATTEMPTS: 5,
    LOGIN_WINDOW: 15 * 60 * 1000, // 15 minutos
    BLOCK_DURATION: 30 * 60 * 1000, // 30 minutos
  },
}

// Configurações de ambiente
export const ENV_CONFIG = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_TEST: process.env.NODE_ENV === 'test',
}

// Configurações de segurança
export const SECURITY_CONFIG = {
  // Headers de segurança
  SECURITY_HEADERS: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-XSS-Protection': '1; mode=block',
  },
  
  // Configurações CORS
  CORS: {
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    ALLOWED_METHODS: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    ALLOWED_HEADERS: ['Content-Type', 'Authorization'],
    CREDENTIALS: true,
  },
}



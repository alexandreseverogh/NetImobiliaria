// Configurações centralizadas da aplicação
// Este arquivo centraliza todos os valores que antes eram hardcoded

export const APP_CONFIG = {
  // Informações gerais da aplicação
  APP_NAME: 'Imovtec',
  APP_VERSION: '1.0.0',
  APP_DESCRIPTION: 'Sistema de gestão imobiliária profissional',

  // Configurações de ambiente
  ENVIRONMENT: {
    DEVELOPMENT: 'development',
    PRODUCTION: 'production',
    TEST: 'test'
  }
} as const

export const DB_CONFIG = {
  // Configurações de pool de conexões
  POOL: {
    MAX_CONNECTIONS: 20,
    IDLE_TIMEOUT: 30000, // 30 segundos
    CONNECTION_TIMEOUT: 2000, // 2 segundos
    MIN_CONNECTIONS: 2
  },

  // Configurações de encoding
  ENCODING: 'UTF8',

  // Configurações de SSL
  SSL: {
    PRODUCTION: { rejectUnauthorized: false },
    DEVELOPMENT: false
  },

  // Configurações de retry
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY_MS: 1000
  }
} as const

export const API_CONFIG = {
  // Configurações de timeout
  TIMEOUT: {
    DEFAULT: 30000, // 30 segundos
    UPLOAD: 120000, // 2 minutos
    DOWNLOAD: 60000 // 1 minuto
  },

  // Configurações de retry
  RETRY: {
    MAX_ATTEMPTS: 3,
    DELAY_MS: 1000
  },

  // Configurações de cache
  CACHE: {
    DEFAULT_TTL: 300000, // 5 minutos
    LONG_TTL: 1800000, // 30 minutos
    SHORT_TTL: 60000 // 1 minuto
  }
} as const

export const PAGINATION_CONFIG = {
  // Configurações de paginação
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 5,

  // Opções de tamanho de página
  PAGE_SIZE_OPTIONS: [5, 10, 20, 50, 100],

  // Configurações de navegação
  MAX_VISIBLE_PAGES: 5
} as const

export const UPLOAD_CONFIG = {
  // Configurações de upload de arquivos
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGES_PER_IMOVEL: 20,

  // Tipos de arquivo permitidos
  ALLOWED_IMAGE_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif'
  ],

  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ],

  // Diretórios de upload
  UPLOAD_DIRS: {
    IMAGES: './public/uploads/imagens',
    DOCUMENTS: './public/uploads/documentos',
    TEMP: './public/uploads/temp'
  }
} as const

export const LOGGING_CONFIG = {
  // Níveis de log
  LEVELS: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
  },

  // Configurações por ambiente
  BY_ENVIRONMENT: {
    development: 'debug',
    production: 'info',
    test: 'error'
  },

  // Configurações de auditoria
  AUDIT: {
    ENABLED: true,
    MAX_LOGS: 10000,
    ROTATION_DAYS: 30
  }
} as const

export const SECURITY_CONFIG = {
  // Configurações de senha
  PASSWORD: {
    MIN_LENGTH: 8,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBERS: true,
    REQUIRE_SPECIAL_CHARS: true,
    SALT_ROUNDS: 12
  },

  // Configurações de sessão
  SESSION: {
    MAX_ACTIVE_SESSIONS: 5,
    SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutos
    REFRESH_THRESHOLD: 5 * 60 * 1000 // 5 minutos
  },

  // Configurações de rate limiting (será sobrescrito pelas configurações de ambiente)
  RATE_LIMIT: {
    LOGIN_ATTEMPTS: 5,
    LOGIN_WINDOW: 15 * 60 * 1000, // 15 minutos
    BLOCK_DURATION: 30 * 60 * 1000, // 30 minutos
    API_REQUESTS: 100,
    API_WINDOW: 15 * 60 * 1000 // 15 minutos
  }
} as const

export const UI_CONFIG = {
  // Configurações de interface
  THEME: {
    PRIMARY_COLOR: '#3B82F6',
    SECONDARY_COLOR: '#6B7280',
    SUCCESS_COLOR: '#10B981',
    WARNING_COLOR: '#F59E0B',
    ERROR_COLOR: '#EF4444'
  },

  // Configurações de breakpoints
  BREAKPOINTS: {
    MOBILE: 768,
    TABLET: 1024,
    DESKTOP: 1280
  },

  // Configurações de animação
  ANIMATION: {
    DURATION: 300,
    EASING: 'ease-in-out'
  }
} as const

// Configurações de validação
export const VALIDATION_CONFIG = {
  // Validações de string
  STRING: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 255,
    DESCRIPTION_MAX_LENGTH: 1000
  },

  // Validações numéricas
  NUMERIC: {
    MIN_PRICE: 0,
    MAX_PRICE: 999999999,
    MIN_AREA: 0,
    MAX_AREA: 99999
  },

  // Validações de email
  EMAIL: {
    PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },

  // Validações de telefone
  PHONE: {
    PATTERN: /^\(\d{2}\)\s\d{4,5}-\d{4}$/
  }
} as const

// Configurações de timestamps e datas
export const TIMESTAMP_CONFIG = {
  // Formatos de data
  DATE_FORMATS: {
    BRAZIL: 'pt-BR',
    ISO: 'ISO',
    US: 'en-US'
  },

  // Formatos de exibição
  DISPLAY_FORMATS: {
    DATE_ONLY: 'dd/MM/yyyy',
    DATETIME: 'dd/MM/yyyy HH:mm',
    TIME_ONLY: 'HH:mm',
    ISO_STRING: 'yyyy-MM-ddTHH:mm:ss.SSSZ'
  },

  // SQL Timestamps
  SQL: {
    CURRENT_TIMESTAMP: 'CURRENT_TIMESTAMP',
    NOW: 'NOW()'
  },

  // JavaScript Timestamps
  JS: {
    ISO_STRING: () => new Date().toISOString(),
    TIMESTAMP: () => Date.now(),
    DATE_OBJECT: () => new Date()
  }
} as const

// Configurações de mensagens
export const MESSAGES = {
  // Mensagens de sucesso
  SUCCESS: {
    SAVED: 'Salvo com sucesso!',
    UPDATED: 'Atualizado com sucesso!',
    DELETED: 'Excluído com sucesso!',
    CREATED: 'Criado com sucesso!'
  },

  // Mensagens de erro
  ERROR: {
    GENERIC: 'Ocorreu um erro inesperado',
    NETWORK: 'Erro de conexão',
    VALIDATION: 'Dados inválidos',
    PERMISSION: 'Acesso negado',
    NOT_FOUND: 'Registro não encontrado'
  },

  // Mensagens de validação
  VALIDATION: {
    REQUIRED: 'Este campo é obrigatório',
    EMAIL_INVALID: 'Email inválido',
    PHONE_INVALID: 'Telefone inválido',
    PASSWORD_WEAK: 'Senha muito fraca',
    FILE_TOO_LARGE: 'Arquivo muito grande',
    FILE_TYPE_INVALID: 'Tipo de arquivo inválido'
  }
} as const

// Configurações de rotas
export const ROUTES = {
  // Rotas públicas
  PUBLIC: {
    HOME: '/',
    LOGIN: '/login',
    ABOUT: '/sobre'
  },

  // Rotas administrativas
  ADMIN: {
    DASHBOARD: '/admin',
    LOGIN: '/admin/login',
    USERS: '/admin/usuarios',
    PROPERTIES: '/admin/imoveis',
    AMENITIES: '/admin/amenidades',
    PROXIMITIES: '/admin/proximidades'
  },

  // APIs
  API: {
    AUTH: '/api/admin/auth',
    USERS: '/api/admin/usuarios',
    PROPERTIES: '/api/admin/imoveis',
    AMENITIES: '/api/admin/amenidades',
    PROXIMITIES: '/api/admin/proximidades'
  }
} as const

// Endpoints API centralizados
export const API_ENDPOINTS = {
  // Autenticação
  AUTH: {
    LOGIN: '/api/admin/auth/login',
    LOGOUT: '/api/admin/auth/logout',
    ME: '/api/admin/auth/me',
    REFRESH: '/api/admin/auth/refresh'
  },

  // Usuários
  USERS: {
    LIST: '/api/admin/usuarios',
    CREATE: '/api/admin/usuarios',
    UPDATE: (id: string) => `/api/admin/usuarios/${id}`,
    DELETE: (id: string) => `/api/admin/usuarios/${id}`,
    ROLES: '/api/admin/roles'
  },

  // Imóveis
  PROPERTIES: {
    LIST: '/api/admin/imoveis',
    CREATE: '/api/admin/imoveis',
    UPDATE: (id: string) => `/api/admin/imoveis/${id}`,
    DELETE: (id: string) => `/api/admin/imoveis/${id}`,
    STATS: '/api/admin/imoveis/stats',
    TYPES: '/api/admin/imoveis/tipos',
    STATUS: '/api/admin/status-imovel',
    FINALIDADES: '/api/admin/imoveis/finalidades'
  },

  // Amenidades
  AMENITIES: {
    LIST: '/api/admin/amenidades',
    CREATE: '/api/admin/amenidades',
    UPDATE: (id: string) => `/api/admin/amenidades/${id}`,
    DELETE: (id: string) => `/api/admin/amenidades/${id}`,
    CATEGORIES: '/api/admin/categorias-amenidades',
    CATEGORIES_CREATE: '/api/admin/categorias-amenidades'
  },

  // Proximidades
  PROXIMITIES: {
    LIST: '/api/admin/proximidades',
    CREATE: '/api/admin/proximidades',
    UPDATE: (id: string) => `/api/admin/proximidades/${id}`,
    DELETE: (id: string) => `/api/admin/proximidades/${id}`,
    CATEGORIES: '/api/admin/categorias-proximidades',
    CATEGORIES_CREATE: '/api/admin/categorias-proximidades'
  },

  // Tipos de Documentos
  DOCUMENT_TYPES: {
    LIST: '/api/admin/tipos-documentos',
    CREATE: '/api/admin/tipos-documentos',
    UPDATE: (id: string) => `/api/admin/tipos-documentos/${id}`,
    DELETE: (id: string) => `/api/admin/tipos-documentos/${id}`
  },

  // Perfis
  PROFILES: {
    LIST: '/api/admin/perfis',
    CREATE: '/api/admin/perfis',
    UPDATE: (id: string) => `/api/admin/perfis/${id}`,
    DELETE: (id: string) => `/api/admin/perfis/${id}`
  },

  // Finalidades
  FINALIDADES: {
    LIST: '/api/admin/finalidades',
    CREATE: '/api/admin/finalidades',
    UPDATE: (id: string) => `/api/admin/finalidades/${id}`,
    DELETE: (id: string) => `/api/admin/finalidades/${id}`
  },

  // Tipos de Imóveis
  PROPERTY_TYPES: {
    LIST: '/api/admin/tipos-imoveis',
    CREATE: '/api/admin/tipos-imoveis',
    UPDATE: (id: string) => `/api/admin/tipos-imoveis/${id}`,
    DELETE: (id: string) => `/api/admin/tipos-imoveis/${id}`
  },

  // Municípios
  MUNICIPALITIES: {
    LIST: '/api/admin/municipios'
  }
} as const

// Exportar todas as configurações como um objeto único
export const CONFIG = {
  APP: APP_CONFIG,
  DATABASE: DB_CONFIG,
  API: API_CONFIG,
  PAGINATION: PAGINATION_CONFIG,
  UPLOAD: UPLOAD_CONFIG,
  LOGGING: LOGGING_CONFIG,
  SECURITY: SECURITY_CONFIG,
  UI: UI_CONFIG,
  VALIDATION: VALIDATION_CONFIG,
  TIMESTAMP: TIMESTAMP_CONFIG,
  MESSAGES: MESSAGES,
  ROUTES: ROUTES,
  ENDPOINTS: API_ENDPOINTS
} as const

// Tipo para validação de configuração
export type ConfigType = typeof CONFIG

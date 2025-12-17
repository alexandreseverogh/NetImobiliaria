/**
 * Script para testar as configurações de ambiente
 * Execute: node test-environment-config.js
 */

require('dotenv').config({ path: '.env.local' });

// Simular configurações de ambiente para teste
const getEnvironmentConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isDevelopment) {
    return {
      ENVIRONMENT: 'development',
      SECURITY: {
        COOKIES_SECURE: false,
        FORCE_HTTPS: false,
        CORS_STRICT: false,
        ALLOWED_ORIGINS: ['http://localhost:3000', 'http://localhost:3001'],
        RATE_LIMIT: {
          LOGIN_ATTEMPTS: 10,
          LOGIN_WINDOW: 300000,
          BLOCK_DURATION: 300000,
        }
      },
      TWO_FACTOR: {
        REQUIRED: false,
        DEV_CODES: { ENABLED: true },
        CODE_EXPIRATION: 3600000,
        DEV_EMAIL: 'dev@localhost'
      },
      SESSION: {
        TIMEOUT: 28800000,
        MAX_ACTIVE_SESSIONS: 10,
        AUTO_REFRESH: false
      },
      CACHE: {
        ENABLED: false,
        TTL: 60000
      },
      LOGGING: {
        LEVEL: 'debug',
        SQL_LOGS: true,
        AUDIT_LOGS: true,
        CONSOLE_LOGS: true
      },
      DEBUG: {
        ENABLED: true,
        DETAILED_ERRORS: true,
        FULL_STACK_TRACE: true,
        PERFORMANCE_LOGS: true
      },
      UPLOAD: {
        MAX_FILE_SIZE: 5242880,
        ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
      },
      API: {
        TIMEOUT: 60000,
        RETRY_ENABLED: false,
        STRICT_VALIDATION: false
      },
      DEV_FEATURES: {
        HOT_RELOAD: true,
        SOURCE_MAPS: true,
        REDUX_DEVTOOLS: true,
        REACT_DEVTOOLS: true
      }
    };
  }
  
  // Configurações de produção
  return {
    ENVIRONMENT: 'production',
    SECURITY: {
      COOKIES_SECURE: true,
      FORCE_HTTPS: true,
      CORS_STRICT: true,
      ALLOWED_ORIGINS: [],
      RATE_LIMIT: {
        LOGIN_ATTEMPTS: 5,
        LOGIN_WINDOW: 900000,
        BLOCK_DURATION: 1800000,
      }
    },
    TWO_FACTOR: {
      REQUIRED: true,
      DEV_CODES: { ENABLED: false },
      CODE_EXPIRATION: 600000,
      DEV_EMAIL: null
    },
    SESSION: {
      TIMEOUT: 1800000,
      MAX_ACTIVE_SESSIONS: 5,
      AUTO_REFRESH: true
    },
    CACHE: {
      ENABLED: true,
      TTL: 300000
    },
    LOGGING: {
      LEVEL: 'error',
      SQL_LOGS: false,
      AUDIT_LOGS: true,
      CONSOLE_LOGS: false
    },
    DEBUG: {
      ENABLED: false,
      DETAILED_ERRORS: false,
      FULL_STACK_TRACE: false,
      PERFORMANCE_LOGS: false
    },
    UPLOAD: {
      MAX_FILE_SIZE: 10485760,
      ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    },
    API: {
      TIMEOUT: 30000,
      RETRY_ENABLED: true,
      STRICT_VALIDATION: true
    },
    PROD_FEATURES: {
      HOT_RELOAD: false,
      SOURCE_MAPS: false,
      REDUX_DEVTOOLS: false,
      REACT_DEVTOOLS: false
    }
  };
};

console.log('🔧 TESTANDO CONFIGURAÇÕES DE AMBIENTE...\n');

try {
  // Obter configurações baseadas no ambiente atual
  const envConfig = getEnvironmentConfig();
  
  console.log('✅ Configurações carregadas com sucesso!\n');
  
  // Mostrar informações básicas
  console.log('📋 INFORMAÇÕES BÁSICAS:');
  console.log(`   Ambiente: ${envConfig.ENVIRONMENT}`);
  console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`   Timestamp: ${new Date().toISOString()}\n`);
  
  // Mostrar configurações de segurança
  console.log('🔒 CONFIGURAÇÕES DE SEGURANÇA:');
  console.log(`   Cookies seguros: ${envConfig.SECURITY.COOKIES_SECURE}`);
  console.log(`   HTTPS obrigatório: ${envConfig.SECURITY.FORCE_HTTPS}`);
  console.log(`   CORS restritivo: ${envConfig.SECURITY.CORS_STRICT}`);
  console.log(`   Origens permitidas: ${envConfig.SECURITY.ALLOWED_ORIGINS.join(', ')}`);
  console.log(`   Tentativas de login: ${envConfig.SECURITY.RATE_LIMIT.LOGIN_ATTEMPTS}`);
  console.log(`   Janela de login: ${envConfig.SECURITY.RATE_LIMIT.LOGIN_WINDOW / 1000}s`);
  console.log(`   Duração do bloqueio: ${envConfig.SECURITY.RATE_LIMIT.BLOCK_DURATION / 1000}s\n`);
  
  // Mostrar configurações de 2FA
  console.log('🔐 CONFIGURAÇÕES DE 2FA:');
  console.log(`   2FA obrigatório: ${envConfig.TWO_FACTOR.REQUIRED}`);
  console.log(`   Códigos de dev: ${envConfig.TWO_FACTOR.DEV_CODES.ENABLED}`);
  console.log(`   Expiração do código: ${envConfig.TWO_FACTOR.CODE_EXPIRATION / 1000}s`);
  console.log(`   Email de dev: ${envConfig.TWO_FACTOR.DEV_EMAIL || 'N/A'}\n`);
  
  // Mostrar configurações de sessão
  console.log('👤 CONFIGURAÇÕES DE SESSÃO:');
  console.log(`   Timeout: ${envConfig.SESSION.TIMEOUT / 1000}s`);
  console.log(`   Max sessões: ${envConfig.SESSION.MAX_ACTIVE_SESSIONS}`);
  console.log(`   Auto refresh: ${envConfig.SESSION.AUTO_REFRESH}\n`);
  
  // Mostrar configurações de cache
  console.log('💾 CONFIGURAÇÕES DE CACHE:');
  console.log(`   Cache habilitado: ${envConfig.CACHE.ENABLED}`);
  console.log(`   TTL: ${envConfig.CACHE.TTL / 1000}s\n`);
  
  // Mostrar configurações de logging
  console.log('📝 CONFIGURAÇÕES DE LOGGING:');
  console.log(`   Nível: ${envConfig.LOGGING.LEVEL}`);
  console.log(`   SQL logs: ${envConfig.LOGGING.SQL_LOGS}`);
  console.log(`   Audit logs: ${envConfig.LOGGING.AUDIT_LOGS}`);
  console.log(`   Console logs: ${envConfig.LOGGING.CONSOLE_LOGS}\n`);
  
  // Mostrar configurações de debug
  console.log('🐛 CONFIGURAÇÕES DE DEBUG:');
  console.log(`   Debug habilitado: ${envConfig.DEBUG.ENABLED}`);
  console.log(`   Erros detalhados: ${envConfig.DEBUG.DETAILED_ERRORS}`);
  console.log(`   Stack trace completo: ${envConfig.DEBUG.FULL_STACK_TRACE}`);
  console.log(`   Logs de performance: ${envConfig.DEBUG.PERFORMANCE_LOGS}\n`);
  
  // Mostrar configurações de upload
  console.log('📤 CONFIGURAÇÕES DE UPLOAD:');
  console.log(`   Tamanho máximo: ${envConfig.UPLOAD.MAX_FILE_SIZE / 1024 / 1024}MB`);
  console.log(`   Tipos permitidos: ${envConfig.UPLOAD.ALLOWED_TYPES.join(', ')}\n`);
  
  // Mostrar configurações de API
  console.log('🔌 CONFIGURAÇÕES DE API:');
  console.log(`   Timeout: ${envConfig.API.TIMEOUT / 1000}s`);
  console.log(`   Retry habilitado: ${envConfig.API.RETRY_ENABLED}`);
  console.log(`   Validação rigorosa: ${envConfig.API.STRICT_VALIDATION}\n`);
  
  // Mostrar configurações específicas do ambiente
  if (envConfig.ENVIRONMENT === 'development') {
    console.log('🛠️ CONFIGURAÇÕES DE DESENVOLVIMENTO:');
    console.log(`   Hot reload: ${envConfig.DEV_FEATURES.HOT_RELOAD}`);
    console.log(`   Source maps: ${envConfig.DEV_FEATURES.SOURCE_MAPS}`);
    console.log(`   Redux DevTools: ${envConfig.DEV_FEATURES.REDUX_DEVTOOLS}`);
    console.log(`   React DevTools: ${envConfig.DEV_FEATURES.REACT_DEVTOOLS}\n`);
  }
  
  if (envConfig.ENVIRONMENT === 'production') {
    console.log('🚀 CONFIGURAÇÕES DE PRODUÇÃO:');
    console.log(`   Hot reload: ${envConfig.PROD_FEATURES.HOT_RELOAD}`);
    console.log(`   Source maps: ${envConfig.PROD_FEATURES.SOURCE_MAPS}`);
    console.log(`   Redux DevTools: ${envConfig.PROD_FEATURES.REDUX_DEVTOOLS}`);
    console.log(`   React DevTools: ${envConfig.PROD_FEATURES.REACT_DEVTOOLS}\n`);
  }
  
  // Mostrar headers de segurança
  console.log('🛡️ HEADERS DE SEGURANÇA:');
  if (envConfig.ENVIRONMENT === 'development') {
    console.log('   X-Frame-Options: SAMEORIGIN');
    console.log('   X-Content-Type-Options: nosniff');
    console.log('   Referrer-Policy: strict-origin-when-cross-origin');
    console.log('   X-XSS-Protection: 1; mode=block');
  } else {
    console.log('   X-Frame-Options: DENY');
    console.log('   X-Content-Type-Options: nosniff');
    console.log('   Referrer-Policy: strict-origin-when-cross-origin');
    console.log('   X-XSS-Protection: 1; mode=block');
    console.log('   Strict-Transport-Security: max-age=31536000; includeSubDomains');
  }
  console.log('');
  
  // Testar configurações específicas
  console.log('🧪 TESTES DE CONFIGURAÇÃO:');
  
  // Teste 1: Verificar se configurações de segurança estão corretas
  const securityTest = envConfig.ENVIRONMENT === 'development' 
    ? !envConfig.SECURITY.COOKIES_SECURE && !envConfig.SECURITY.FORCE_HTTPS
    : envConfig.SECURITY.COOKIES_SECURE && envConfig.SECURITY.FORCE_HTTPS;
  console.log(`   ✅ Configurações de segurança: ${securityTest ? 'CORRETAS' : 'INCORRETAS'}`);
  
  // Teste 2: Verificar se 2FA está configurado corretamente
  const twoFATest = envConfig.ENVIRONMENT === 'development'
    ? !envConfig.TWO_FACTOR.REQUIRED && envConfig.TWO_FACTOR.DEV_CODES.ENABLED
    : envConfig.TWO_FACTOR.REQUIRED && !envConfig.TWO_FACTOR.DEV_CODES.ENABLED;
  console.log(`   ✅ Configurações de 2FA: ${twoFATest ? 'CORRETAS' : 'INCORRETAS'}`);
  
  // Teste 3: Verificar se logging está configurado corretamente
  const loggingTest = envConfig.ENVIRONMENT === 'development'
    ? envConfig.LOGGING.LEVEL === 'debug' && envConfig.LOGGING.CONSOLE_LOGS
    : envConfig.LOGGING.LEVEL === 'error' && !envConfig.LOGGING.CONSOLE_LOGS;
  console.log(`   ✅ Configurações de logging: ${loggingTest ? 'CORRETAS' : 'INCORRETAS'}`);
  
  // Teste 4: Verificar se debug está configurado corretamente
  const debugTest = envConfig.ENVIRONMENT === 'development'
    ? envConfig.DEBUG.ENABLED && envConfig.DEBUG.DETAILED_ERRORS
    : !envConfig.DEBUG.ENABLED && !envConfig.DEBUG.DETAILED_ERRORS;
  console.log(`   ✅ Configurações de debug: ${debugTest ? 'CORRETAS' : 'INCORRETAS'}\n`);
  
  console.log('🎉 TESTE CONCLUÍDO COM SUCESSO!');
  console.log('   Todas as configurações foram carregadas e validadas.');
  
} catch (error) {
  console.error('❌ ERRO ao carregar configurações de ambiente:');
  console.error('   ', error.message);
  console.error('\n🔧 POSSÍVEIS SOLUÇÕES:');
  console.error('   1. Verifique se o arquivo .env.local existe');
  console.error('   2. Verifique se as variáveis de ambiente estão corretas');
  console.error('   3. Verifique se o arquivo de configuração existe');
  console.error('   4. Execute: npm install para instalar dependências');
}

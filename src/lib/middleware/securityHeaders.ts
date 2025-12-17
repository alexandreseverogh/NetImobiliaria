import { NextRequest, NextResponse } from 'next/server';

// Níveis de segurança para ativação gradual
type SecurityLevel = 'disabled' | 'basic' | 'medium' | 'full';

// Variável de ambiente para controlar o nível de segurança
const CURRENT_SECURITY_HEADERS_LEVEL: SecurityLevel = (process.env.SECURITY_HEADERS_LEVEL as SecurityLevel) || 'basic';

export function securityHeadersMiddleware(request: NextRequest): NextResponse | null {
  const response = NextResponse.next();

  if (CURRENT_SECURITY_HEADERS_LEVEL === 'disabled') {
    return null; // Headers desabilitados, não faz nada
  }

  // X-Frame-Options: Previne clickjacking
  response.headers.set('X-Frame-Options', 'DENY');

  // X-Content-Type-Options: Previne MIME-sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');

  // Referrer-Policy: Controla o envio de informações de referência
  response.headers.set('Referrer-Policy', 'no-referrer-when-downgrade');

  // X-XSS-Protection: Ativa o filtro de XSS em navegadores mais antigos
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Apenas para níveis 'medium' e 'full'
  if (CURRENT_SECURITY_HEADERS_LEVEL === 'medium' || CURRENT_SECURITY_HEADERS_LEVEL === 'full') {
    // Strict-Transport-Security (HSTS): Garante que o navegador sempre use HTTPS
    // Apenas para produção
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }

    // Permissions-Policy: Controla APIs do navegador
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  }

  // Apenas para nível 'full'
  if (CURRENT_SECURITY_HEADERS_LEVEL === 'full') {
    // Content-Security-Policy (CSP): Previne XSS e injeção de dados
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Necessário para Next.js
      "style-src 'self' 'unsafe-inline'", // Necessário para Tailwind CSS
      "img-src 'self' data: blob: https:", // Permite imagens externas
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'"
    ].join('; ');
    
    response.headers.set('Content-Security-Policy', csp);
  }

  return response;
}

// Função para ativar headers (para uso em scripts de teste ou configuração)
export function activateSecurityHeaders(level: SecurityLevel) {
  process.env.SECURITY_HEADERS_LEVEL = level;
  console.log(`🛡️ Headers de segurança definidos para o nível: ${level}`);
}

// Função para desativar headers (para rollback)
export function deactivateSecurityHeaders() {
  process.env.SECURITY_HEADERS_LEVEL = 'disabled';
  console.log('❌ Headers de segurança desativados.');
}

// Função para verificar nível atual
export function getCurrentSecurityLevel(): SecurityLevel {
  return CURRENT_SECURITY_HEADERS_LEVEL;
}





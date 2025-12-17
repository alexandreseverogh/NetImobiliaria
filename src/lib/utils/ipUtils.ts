import { NextRequest } from 'next/server'

/**
 * Função centralizada para capturar IP real do cliente
 * Reutiliza a lógica já testada e funcionando do login
 */
export function getClientIP(request: NextRequest): string {
  // Obter IP real do cliente (múltiplas tentativas) - mesma lógica do login
  let ipAddress = 'unknown';
  
  // Tentar diferentes headers de proxy
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  const clientIp = request.headers.get('x-client-ip');
  
  if (forwardedFor) {
    // x-forwarded-for pode ter múltiplos IPs, pegar o primeiro
    ipAddress = forwardedFor.split(',')[0].trim();
  } else if (realIp) {
    ipAddress = realIp;
  } else if (cfConnectingIp) {
    ipAddress = cfConnectingIp;
  } else if (clientIp) {
    ipAddress = clientIp;
  } else {
    // Fallback para IP de conexão direta
    ipAddress = (request as any).ip || 'unknown';
  }
  
  // Se for IP local, manter como está
  // A API de geolocalização será consultada sem IP específico (detecção automática)
  // Isso permite que funcione em desenvolvimento
  if (ipAddress === '::1' || ipAddress === '127.0.0.1' || ipAddress === 'localhost') {
    // Manter IP local - a API será consultada sem IP específico
    // Isso permite detecção automática pela API
    console.log('ℹ️ [IP UTILS] IP local detectado, será usado detecção automática pela API')
  }
  
  return ipAddress;
}

/**
 * Função para extrair dados do request (IP + User-Agent)
 */
export function extractRequestData(request: NextRequest): { ipAddress: string; userAgent: string } {
  return {
    ipAddress: getClientIP(request),
    userAgent: request.headers.get('user-agent') || 'unknown'
  };
}





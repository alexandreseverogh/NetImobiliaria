import { NextRequest } from 'next/server'

/**
 * Função centralizada para capturar IP real do cliente
 * Reutiliza a lógica já testada e funcionando do login
 */
export function getClientIP(request: NextRequest): string {
  const normalizeIp = (raw: string): string => {
    let ip = raw.trim()
    // remover porta (IPv4: "1.2.3.4:1234")
    if (ip.includes(':') && ip.includes('.') && !ip.startsWith('[')) {
      ip = ip.split(':')[0].trim()
    }
    // remover colchetes (IPv6: "[2001:db8::1]")
    if (ip.startsWith('[') && ip.endsWith(']')) {
      ip = ip.slice(1, -1)
    }
    // IPv4 mapeado em IPv6 ("::ffff:1.2.3.4")
    if (ip.toLowerCase().startsWith('::ffff:')) {
      ip = ip.slice('::ffff:'.length)
    }
    return ip
  }

  const isLocalOrPrivate = (rawIp: string): boolean => {
    const ip = normalizeIp(rawIp)
    if (!ip || ip === 'unknown' || ip === 'localhost') return true
    if (ip === '127.0.0.1' || ip === '::1' || ip === '0.0.0.0') return true

    // IPv4 privados
    if (ip.startsWith('10.')) return true
    if (ip.startsWith('192.168.')) return true
    const m172 = ip.match(/^172\.(\d+)\./)
    if (m172) {
      const second = parseInt(m172[1] ?? '', 10)
      if (second >= 16 && second <= 31) return true
    }
    // Link-local
    if (ip.startsWith('169.254.')) return true

    // IPv6 privados / reservados comuns
    const low = ip.toLowerCase()
    if (low.startsWith('fc') || low.startsWith('fd')) return true // ULA
    if (low.startsWith('fe80:')) return true // link-local

    return false
  }

  const pickFirstPublicFromXff = (xff: string): string | null => {
    const parts = xff
      .split(',')
      .map((p) => normalizeIp(p))
      .filter(Boolean)

    // preferir o primeiro IP PÚBLICO na cadeia (mais confiável em proxy bem configurado)
    for (const ip of parts) {
      if (!isLocalOrPrivate(ip)) return ip
    }

    // se todos forem privados, ainda devolvemos o primeiro para debug/telemetria
    return parts[0] || null
  }

  // 1) Headers de proxy/CDN (ordem importa)
  const cfConnectingIp = request.headers.get('cf-connecting-ip')
  if (cfConnectingIp) return normalizeIp(cfConnectingIp)

  const realIp = request.headers.get('x-real-ip')
  if (realIp && !isLocalOrPrivate(realIp)) return normalizeIp(realIp)

  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    const ip = pickFirstPublicFromXff(forwardedFor)
    if (ip) return ip
  }

  const clientIp = request.headers.get('x-client-ip')
  if (clientIp) return normalizeIp(clientIp)

  // 2) Fallback: IP visto pelo runtime
  const runtimeIp = (request as any).ip
  if (runtimeIp) return normalizeIp(runtimeIp)

  return 'unknown'
}

/**
 * Função para extrair dados do request (IP + User-Agent)
 */
export function extractRequestData(request: NextRequest): { ipAddress: string; userAgent: string } {
  return {
    ipAddress: getClientIP(request),
    userAgent: request.headers.get('user-agent') || 'unknown'
  }
}





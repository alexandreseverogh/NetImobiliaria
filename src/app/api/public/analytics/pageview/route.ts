import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { createHash } from 'crypto'

export const runtime = 'nodejs'


// Classifica o tipo de página a partir do path
function classifyPageType(path: string): { page_type: string; imovel_id: number | null } {
    if (path === '/' || path === '') return { page_type: 'home', imovel_id: null }

    const imovelMatch = path.match(/^\/imoveis\/(\d+)/)
    if (imovelMatch) return { page_type: 'imovel', imovel_id: parseInt(imovelMatch[1]) }

    if (path.startsWith('/imoveis')) return { page_type: 'pesquisa', imovel_id: null }
    if (path.startsWith('/procurar-imovel')) return { page_type: 'pesquisa', imovel_id: null }
    if (path.startsWith('/mapa-imoveis')) return { page_type: 'mapa', imovel_id: null }
    if (path.startsWith('/landpaging')) return { page_type: 'landpaging', imovel_id: null }
    if (path.startsWith('/corretor')) return { page_type: 'corretor', imovel_id: null }
    if (path.startsWith('/meu-perfil')) return { page_type: 'meu-perfil', imovel_id: null }
    if (path.startsWith('/anunciar-imovel')) return { page_type: 'anunciar-imovel', imovel_id: null }

    return { page_type: 'other', imovel_id: null }
}

// Classifica a origem do tráfego a partir do referrer
function classifyReferrer(referrer: string | null): string {
    if (!referrer) return 'direct'

    const url = referrer.toLowerCase()
    if (url.includes('google.') || url.includes('bing.') || url.includes('yahoo.') || url.includes('duckduckgo.')) return 'google'
    if (url.includes('facebook.') || url.includes('instagram.') || url.includes('linkedin.') || url.includes('twitter.') || url.includes('youtube.')) return 'social'
    if (url.includes('whatsapp.')) return 'social'

    return 'other'
}

// Detecta tipo de dispositivo a partir do User-Agent
function detectDevice(userAgent: string): { device_type: string; browser: string | null; os: string | null } {
    const ua = userAgent.toLowerCase()

    // Detectar bots primeiro
    if (ua.includes('bot') || ua.includes('crawler') || ua.includes('spider') || ua.includes('googlebot') || ua.includes('bingbot')) {
        return { device_type: 'bot', browser: null, os: null }
    }

    // Tipo de dispositivo
    let device_type = 'desktop'
    if (ua.includes('mobile') || ua.includes('android') && !ua.includes('tablet')) device_type = 'mobile'
    else if (ua.includes('tablet') || ua.includes('ipad')) device_type = 'tablet'

    // Browser
    let browser: string | null = null
    if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome'
    else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari'
    else if (ua.includes('firefox')) browser = 'Firefox'
    else if (ua.includes('edg')) browser = 'Edge'
    else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera'

    // OS
    let os: string | null = null
    if (ua.includes('android')) os = 'Android'
    else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS'
    else if (ua.includes('windows')) os = 'Windows'
    else if (ua.includes('mac os')) os = 'macOS'
    else if (ua.includes('linux')) os = 'Linux'

    return { device_type, browser, os }
}

// Lê ou cria session_id do cookie
function getSessionId(request: NextRequest): { sessionId: string; isNew: boolean } {
    const existing = request.cookies.get('_atk_sid')?.value
    if (existing && existing.length === 64) return { sessionId: existing, isNew: false }

    // Gerar novo session ID aleatório (sem PII)
    const newId = createHash('sha256').update(Math.random().toString() + Date.now().toString()).digest('hex')
    return { sessionId: newId, isNew: true }
}

export async function POST(request: NextRequest) {
    // Responder imediatamente — máxima velocidade para o cliente
    const responsePromise = new Promise<void>(async (resolve) => {
        try {
            const body = await request.json()
            const { path, referrer, title, utm_source, utm_medium, utm_campaign } = body

            if (!path) { resolve(); return }

            // Classificações
            const { page_type, imovel_id } = classifyPageType(path)
            const referrer_type = classifyReferrer(referrer)

            const userAgent = request.headers.get('user-agent') || ''
            const { device_type, browser, os } = detectDevice(userAgent)

            // Não rastrear bots
            if (device_type === 'bot') { resolve(); return }

            // Hash do IP (LGPD — nunca armazena o IP real)
            const rawIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
                || request.headers.get('x-real-ip')
                || 'unknown'
            const ip_hash = createHash('sha256').update(rawIp).digest('hex')

            // Session ID
            const { sessionId } = getSessionId(request)

            // Inserir no banco (assíncrono, não bloqueia a resposta)
            await pool.query(
                `INSERT INTO public.analytics_pageviews
          (page_path, page_title, page_type, imovel_id, session_id, ip_hash,
           referrer, referrer_type, utm_source, utm_medium, utm_campaign,
           device_type, browser, os)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
                [
                    path.substring(0, 2000),
                    title?.substring(0, 500) || null,
                    page_type,
                    imovel_id,
                    sessionId,
                    ip_hash,
                    referrer?.substring(0, 2000) || null,
                    referrer_type,
                    utm_source?.substring(0, 200) || null,
                    utm_medium?.substring(0, 200) || null,
                    utm_campaign?.substring(0, 200) || null,
                    device_type,
                    browser,
                    os,
                ]
            )
        } catch {
            // Silencia erros — analytics nunca deve impactar o usuário
        }
        resolve()
    })

    // Criar resposta com cookie de sessão
    const { sessionId, isNew } = getSessionId(request)
    const response = NextResponse.json({ ok: true }, { status: 200 })

    if (isNew) {
        response.cookies.set('_atk_sid', sessionId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30, // 30 dias
            path: '/',
        })
    }

    // Não aguardar o insert para responder ao cliente — verdadeiro fire-and-forget
    responsePromise.catch(() => { })

    return response
}

import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/auth/google/authorize
 * Inicia o fluxo OAuth 2.0 para autorizar acesso ao Google Calendar do usuário
 */
export async function GET(request: NextRequest) {
  const clientId    = process.env.GOOGLE_CLIENT_ID
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Integração Google Calendar não configurada. Contacte o administrador.' },
      { status: 503 }
    )
  }

  // Tentar capturar o userId da sessão para garantir o vínculo correto no callback
  const token = request.cookies.get('admin_auth_token')?.value
  let userId = null
  
  if (token) {
    try {
      const jwt = require('jsonwebtoken')
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret')
      userId = (decoded as any).userId
    } catch {}
  }

  // Salvar a URL de retorno e o userId para redirecionar após OAuth
  const returnUrl = request.nextUrl.searchParams.get('returnUrl') || '/crm/kanban'
  
  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly',
    access_type:   'offline',
    prompt:        'consent',
    state:         encodeURIComponent(JSON.stringify({ returnUrl, userId })),
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  )
}

import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { verifyAuthOrRespond } from '@/lib/auth/authHelpers'

/**
 * GET /api/auth/google/callback
 * Recebe o code do Google, troca pelo refresh_token e salva no usuário
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Usuário recusou a autorização
  if (error || !code) {
    return NextResponse.redirect(
      new URL('/crm/kanban?google_auth=denied', request.url)
    )
  }

  // Trocar code por tokens
  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  process.env.GOOGLE_REDIRECT_URI!,
      grant_type:    'authorization_code',
    }),
  })

  if (!tokenResp.ok) {
    console.error('[Google OAuth] Falha ao trocar code:', await tokenResp.text())
    return NextResponse.redirect(
      new URL('/crm/kanban?google_auth=error', request.url)
    )
  }

  const tokens = await tokenResp.json()
  const refreshToken = tokens.refresh_token

  if (!refreshToken) {
    // Se não veio refresh_token, o usuário já autorizou antes e o token já está salvo
    return NextResponse.redirect(
      new URL('/crm/kanban?google_auth=already_authorized', request.url)
    )
  }

  // Extrair metadados do state
  let userIdFromState = null
  let returnUrl = '/crm/kanban?google_auth=success'
  
  try {
    if (state) {
      const decodedState = decodeURIComponent(state)
      const parsed = JSON.parse(decodedState)
      userIdFromState = parsed.userId
      if (parsed.returnUrl) {
        returnUrl = parsed.returnUrl.includes('?') 
          ? `${parsed.returnUrl}&google_auth=success` 
          : `${parsed.returnUrl}?google_auth=success`
      }
    }
  } catch (err) {
    console.error('[Google OAuth] Erro ao parsear state:', err)
  }

  // Buscar informações do usuário no Google para ter o e-mail (fallback e registro)
  const userInfoResp = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  })
  const userInfo = await userInfoResp.json()
  const googleEmail = userInfo.email as string

  console.log('📡 [Google OAuth Callback] Processando:', {
    userIdFromState,
    googleEmail,
    hasRefreshToken: !!refreshToken
  })

  // PRIORIDADE 1: Salvar usando o userId do state (Garante o vínculo na sessão atual)
  // PRIORIDADE 2: Salvar usando o e-mail (Fallback se o state falhou)
  const { rows } = await pool.query(
    `UPDATE users 
     SET google_refresh_token = $1, google_calendar_authorized = true
     WHERE id = $2 OR email = $3
     RETURNING id, nome, email`,
    [refreshToken, userIdFromState, googleEmail]
  )

  if (rows.length === 0) {
    console.warn('❌ [Google OAuth] Vínculo falhou. Usuário não encontrado para:', { userIdFromState, googleEmail })
  } else {
    console.log(`✅ [Google OAuth] Vínculo realizado para: ${rows[0].nome} (${rows[0].email})`)
  }

  return NextResponse.redirect(new URL(returnUrl, request.url))
}

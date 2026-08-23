/**
 * Google Calendar Service
 * Abstração sobre a Google Calendar API v3
 * Usa fetch nativo — sem dependência extra de pacote
 */

import pool from '@/lib/database/connection'

// ── Tipos ─────────────────────────────────────────────────────

export interface GoogleEventInput {
  summary: string
  description?: string
  location?: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  attendees?: { email: string; displayName?: string }[]
}

export interface AvailableSlot {
  inicio: string    // ISO 8601
  fim: string       // ISO 8601
  disponivel: boolean
}

// ── Helpers OAuth ──────────────────────────────────────────────

/**
 * Obtém access_token atual usando refresh_token do usuário
 * (PKCE / OAuth 2.0 server-side)
 */
async function getAccessToken(refreshToken: string): Promise<string> {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }),
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Falha ao renovar access_token: ${err}`)
  }
  const json = await resp.json()
  return json.access_token as string
}

/**
 * Obtém access_token para a Service Account (calendário da empresa)
 */
async function getServiceAccountToken(): Promise<string> {
  const keyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY
  if (!keyRaw) throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY não configurada')

  const key = JSON.parse(keyRaw)

  // JWT para Service Account (RS256)
  const now = Math.floor(Date.now() / 1000)
  const claim = {
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/calendar',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  // Assinar com a chave privada via Web Crypto API (disponível no Node 18+)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify(claim)).toString('base64url')
  const unsigned = `${header}.${payload}`

  const { createSign } = await import('crypto')
  const sign = createSign('RSA-SHA256')
  sign.update(unsigned)
  const signature = sign.sign(key.private_key).toString('base64url')
  const assertion = `${unsigned}.${signature}`

  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  if (!resp.ok) throw new Error(`Service Account token error: ${await resp.text()}`)
  const json = await resp.json()
  return json.access_token as string
}

// ── Disponibilidade ────────────────────────────────────────────

/**
 * Verifica slots disponíveis combinando calendário do usuário + empresa. O do usuário é
 * best-effort: quando o atendente logado não conectou a própria conta Google
 * (`userRefreshToken` ausente), a checagem roda só com o calendário da empresa — nunca bloqueia
 * o agendamento por falta de conexão pessoal, só reduz a checagem de conflito à empresa.
 * @param tenantEmail   E-mail Google da empresa (tenants.google_email)
 * @param userRefreshToken  refresh_token do corretor, se ele já conectou a própria conta
 * @param date          Data a verificar (YYYY-MM-DD)
 * @param duracaoMin    Duração de cada slot em minutos
 */
export async function getAvailableSlots(
  tenantEmail: string,
  userRefreshToken: string | null | undefined,
  date: string,
  duracaoMin: number = 60
): Promise<AvailableSlot[]> {
  const tz = 'America/Recife'
  const dayStart = new Date(`${date}T07:00:00-03:00`).toISOString()
  const dayEnd   = new Date(`${date}T22:00:00-03:00`).toISOString()

  // Token do usuário é opcional — sem ele, a disponibilidade é calculada só pelo calendário
  // da empresa (nunca lança erro por falta de conexão pessoal).
  let userToken: string | null = null
  if (userRefreshToken) {
    try {
      userToken = await getAccessToken(userRefreshToken)
    } catch (err) {
      console.warn('⚠️ [CalendarService] Falha ao renovar token pessoal do usuário. Ignorando calendário pessoal.', err)
    }
  }

  let saToken = null
  try {
    saToken = await getServiceAccountToken()
  } catch (err) {
    console.warn('⚠️ [CalendarService] Service Account não configurada. Ignorando calendário da empresa.')
  }

  // freebusy em paralelo
  const freeBusyBody = {
    timeMin: dayStart,
    timeMax: dayEnd,
    timeZone: tz,
    items: [{ id: 'primary' }],
  }

  const fetchPromises: Promise<Response>[] = []
  const sources: ('user' | 'company')[] = []

  if (userToken) {
    sources.push('user')
    fetchPromises.push(
      fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${userToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(freeBusyBody),
      })
    )
  }

  if (saToken && tenantEmail) {
    sources.push('company')
    fetchPromises.push(
      fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${saToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...freeBusyBody, items: [{ id: tenantEmail }] }),
      })
    )
  }

  const responses = await Promise.all(fetchPromises)
  const jsons = await Promise.all(responses.map(r => r.json()))

  const userJson = sources.includes('user') ? jsons[sources.indexOf('user')] : null
  const saJson = sources.includes('company') ? jsons[sources.indexOf('company')] : null

  const userBusy: { start: string; end: string }[] =
    userJson?.calendars?.primary?.busy || []
  const companyBusy: { start: string; end: string }[] =
    (saJson && tenantEmail && saJson.calendars?.[tenantEmail]?.busy) || []

  const allBusy = [...userBusy, ...companyBusy]

  // Gerar slots de duracaoMin entre 08:00 e 19:00
  const slots: AvailableSlot[] = []
  let cursor = new Date(dayStart)
  const end  = new Date(dayEnd)

  while (cursor < end) {
    const slotEnd = new Date(cursor.getTime() + duracaoMin * 60 * 1000)
    if (slotEnd > end) break

    const hasConflict = allBusy.some(b => {
      const bs = new Date(b.start)
      const be = new Date(b.end)
      return cursor < be && slotEnd > bs
    })

    slots.push({
      inicio: cursor.toISOString(),
      fim: slotEnd.toISOString(),
      disponivel: !hasConflict,
    })

    cursor = slotEnd
  }

  return slots
}

// ── Criar Evento ───────────────────────────────────────────────

export async function createEventUsuario(
  refreshToken: string,
  event: GoogleEventInput
): Promise<{ eventId: string; htmlLink: string }> {
  const token = await getAccessToken(refreshToken)
  const resp = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }
  )
  if (!resp.ok) throw new Error(`Erro ao criar evento (usuário): ${await resp.text()}`)
  const json = await resp.json()
  return { eventId: json.id, htmlLink: json.htmlLink }
}

export async function createEventEmpresa(
  calendarId: string,
  event: GoogleEventInput
): Promise<{ eventId: string; htmlLink: string }> {
  const token = await getServiceAccountToken()
  const resp = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    }
  )
  if (!resp.ok) throw new Error(`Erro ao criar evento (empresa): ${await resp.text()}`)
  const json = await resp.json()
  return { eventId: json.id, htmlLink: json.htmlLink }
}

// ── Deletar Evento ─────────────────────────────────────────────

export async function deleteEventUsuario(
  refreshToken: string,
  eventId: string
): Promise<void> {
  const token = await getAccessToken(refreshToken)
  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
  )
}

export async function deleteEventEmpresa(
  calendarId: string,
  eventId: string
): Promise<void> {
  const token = await getServiceAccountToken()
  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${eventId}`,
    { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
  )
}

// ── Buscar refresh_token do usuário no banco ───────────────────

export async function getUserRefreshToken(userId: string): Promise<string | null> {
  const { rows } = await pool.query(
    'SELECT google_refresh_token FROM users WHERE id = $1',
    [userId]
  )
  return rows[0]?.google_refresh_token || null
}

// ── Buscar configuração do tenant ────────────────────────────

export async function getTenantCalendarConfig(tenantId: string): Promise<{
  calendario: boolean
  google_email: string | null
  duracao_visita: number
} | null> {
  const { rows } = await pool.query(
    'SELECT calendario, google_email, duracao_visita FROM tenants WHERE id = $1',
    [tenantId]
  )
  if (!rows[0]) return null
  return {
    calendario: rows[0].calendario ?? false,
    google_email: rows[0].google_email ?? null,
    duracao_visita: rows[0].duracao_visita ?? 60,
  }
}

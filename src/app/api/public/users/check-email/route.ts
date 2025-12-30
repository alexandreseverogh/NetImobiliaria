import { NextRequest, NextResponse } from 'next/server'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { getClientIP } from '@/lib/utils/ipUtils'
import pool from '@/lib/database/connection'

const limiter = new RateLimiterMemory({
  points: 60,
  duration: 60 * 60
})

export async function GET(request: NextRequest) {
  const ip = getClientIP(request)
  try {
    await limiter.consume(ip)
  } catch {
    return NextResponse.json({ success: false, error: 'Muitas tentativas.' }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const emailRaw = String(searchParams.get('email') || '').trim().toLowerCase()

  if (!emailRaw) {
    return NextResponse.json({ success: true, available: false }, { status: 200 })
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
    return NextResponse.json({ success: true, available: false }, { status: 200 })
  }

  const r = await pool.query('SELECT 1 FROM users WHERE lower(email) = $1 LIMIT 1', [emailRaw])
  const exists = r.rows.length > 0

  return NextResponse.json({ success: true, available: !exists }, { status: 200 })
}



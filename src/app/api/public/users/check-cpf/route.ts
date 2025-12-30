import { NextRequest, NextResponse } from 'next/server'
import { RateLimiterMemory } from 'rate-limiter-flexible'
import { getClientIP } from '@/lib/utils/ipUtils'
import pool from '@/lib/database/connection'
import { validateCPF } from '@/lib/utils/formatters'

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
  const cpfRaw = String(searchParams.get('cpf') || '').trim()
  const cpfDigits = cpfRaw.replace(/\D/g, '')

  if (!cpfDigits) {
    return NextResponse.json({ success: true, available: false }, { status: 200 })
  }

  if (!validateCPF(cpfDigits)) {
    return NextResponse.json({ success: true, available: false }, { status: 200 })
  }

  const r = await pool.query('SELECT 1 FROM users WHERE cpf = $1 LIMIT 1', [cpfDigits])
  const exists = r.rows.length > 0

  return NextResponse.json({ success: true, available: !exists }, { status: 200 })
}



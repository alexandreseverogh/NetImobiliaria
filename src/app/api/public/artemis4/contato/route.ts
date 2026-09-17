import { NextRequest, NextResponse } from 'next/server'
import { applyPublicRateLimit } from '@/lib/security/rate-limiter'
import { sendSpecialistContactRequest } from '@/lib/google/emailService'

export const dynamic = 'force-dynamic'

/**
 * Recebe o formulário "Falar com um especialista" da landing pública Artemis9
 * e envia um e-mail com os dados para o endereço configurado via SMTP
 * (SMTP_USER) — nunca confia em validação só do cliente, revalida tudo aqui.
 */
export async function POST(request: NextRequest) {
  const limited = await applyPublicRateLimit(request)
  if (limited) return limited

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Payload inválido' }, { status: 400 })
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ success: false, error: 'Payload inválido' }, { status: 400 })
  }

  const data = body as Record<string, unknown>

  const personType = data.personType === 'pj' ? 'pj' : data.personType === 'pf' ? 'pf' : null
  const name = typeof data.name === 'string' ? data.name.trim() : ''
  const segment = typeof data.segment === 'string' ? data.segment.trim() : ''
  const demand = typeof data.demand === 'string' ? data.demand.trim() : ''
  const contactName = typeof data.contactName === 'string' ? data.contactName.trim() : ''
  const whatsappDigits = typeof data.whatsapp === 'string' ? data.whatsapp.replace(/\D/g, '') : ''

  if (!personType) {
    return NextResponse.json({ success: false, error: 'Informe se é Pessoa Física ou Jurídica' }, { status: 400 })
  }
  if (name.length < 2) {
    return NextResponse.json({ success: false, error: 'Nome / Razão Social inválido' }, { status: 400 })
  }
  if (segment.length < 2) {
    return NextResponse.json({ success: false, error: 'Informe o segmento de atuação' }, { status: 400 })
  }
  if (demand.length < 5) {
    return NextResponse.json({ success: false, error: 'Conte um pouco mais sobre sua demanda' }, { status: 400 })
  }
  if (contactName.length < 2) {
    return NextResponse.json({ success: false, error: 'Informe o nome do contato' }, { status: 400 })
  }
  if (whatsappDigits.length < 10 || whatsappDigits.length > 11) {
    return NextResponse.json({ success: false, error: 'Informe um WhatsApp válido com DDD' }, { status: 400 })
  }

  try {
    await sendSpecialistContactRequest({
      personType,
      name,
      segment,
      demand,
      contactName,
      whatsapp: whatsappDigits,
    })
  } catch (error) {
    console.error('[artemis4/contato] falha ao enviar e-mail:', error)
    return NextResponse.json(
      { success: false, error: 'Não foi possível enviar agora. Tente novamente em instantes.' },
      { status: 502 },
    )
  }

  return NextResponse.json({ success: true })
}

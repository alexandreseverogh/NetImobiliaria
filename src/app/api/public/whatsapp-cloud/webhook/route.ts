import { createHmac, timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/database/connection'
import { processInboundWhatsAppMessage } from '@/lib/whatsapp/inboundProcessor'

export const dynamic = 'force-dynamic'

/**
 * Adaptador FINO do WhatsApp Cloud API oficial (Meta) — igual em espírito ao de
 * src/app/api/public/evolution/webhook/route.ts, só que pro provider oficial (achado #4,
 * docs/PLANO_WHATSAPP_CLOUD_API_PROVIDER.md). Toda a lógica de negócio continua em
 * processInboundWhatsAppMessage, agnóstica de provider — zero mudança lá.
 *
 * GET — handshake de verificação que a Meta faz UMA VEZ ao configurar a URL do webhook no
 * App Dashboard (ou via Embedded Signup): confirma hub.verify_token e devolve hub.challenge.
 *
 * Correção de arquitetura (docs/PLANO_WHATSAPP_CLOUD_API_PROVIDER.md seção 10): o Meta App é
 * por TENANT (reaproveita tenants.meta_app_id/meta_app_secret, já usados por Meta Ads nesta
 * base), não por tenant+cliente nem um App único da plataforma — cada cliente de um tenant
 * conecta o PRÓPRIO WhatsApp via Embedded Signup contra o App do TENANT que o gerencia, sem
 * nunca precisar criar nada. `app_secret`/`webhook_verify_token` vivem em `tenants`, não mais
 * em `whatsapp_cloud_credentials` (essa tabela guarda só o que varia por CLIENTE de verdade:
 * phone_number_id/waba_id/access_token).
 */
export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams
  const mode = params.get('hub.mode')
  const verifyToken = params.get('hub.verify_token')
  const challenge = params.get('hub.challenge')

  if (mode !== 'subscribe' || !verifyToken || !challenge) {
    return NextResponse.json({ ok: false, error: 'parâmetros de handshake ausentes' }, { status: 400 })
  }

  const { rows } = await pool.query(
    `SELECT 1 FROM public.tenants WHERE whatsapp_webhook_verify_token = $1 AND status = 'active' LIMIT 1`,
    [verifyToken],
  )
  if (!rows[0]) return NextResponse.json({ ok: false, error: 'verify_token inválido' }, { status: 403 })

  // A Meta espera o valor crú de hub.challenge no corpo da resposta, texto puro (não JSON).
  return new NextResponse(challenge, { status: 200 })
}

/**
 * POST — evento real de mensagem recebida. Corpo real (pesquisado, não por memória):
 * entry[].changes[].value.{metadata.phone_number_id, contacts[].profile.name,
 * messages[].{from, id, text.body}}.
 *
 * Autenticação: header X-Hub-Signature-256 = HMAC-SHA256(corpo bruto, app_secret) — o
 * app_secret certo é o do TENANT dono do phone_number_id recebido (seção 10 do plano — App é
 * por tenant, reaproveita tenants.meta_app_secret). Ordem: (1) identificar a credencial pelo
 * phone_number_id → (2) pegar o app_secret do tenant dela → (3) validar a assinatura → (4)
 * só então processar.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  let body: any
  try { body = JSON.parse(rawBody) } catch { return NextResponse.json({ ok: false }, { status: 400 }) }

  const entries: any[] = Array.isArray(body?.entry) ? body.entry : []
  if (entries.length === 0) return NextResponse.json({ ok: true, ignored: true })

  for (const entry of entries) {
    const changes: any[] = Array.isArray(entry?.changes) ? entry.changes : []
    for (const change of changes) {
      const value = change?.value
      const phoneNumberId: string | undefined = value?.metadata?.phone_number_id
      if (!phoneNumberId) continue

      const { rows: credRows } = await pool.query(
        `SELECT c.tenant_id, c.client_id, t.meta_app_secret
           FROM mensageria.whatsapp_cloud_credentials c
           JOIN public.tenants t ON t.id = c.tenant_id
          WHERE c.phone_number_id = $1 AND c.is_active = true LIMIT 1`,
        [phoneNumberId],
      )
      const cred = credRows[0]
      if (!cred?.meta_app_secret) continue // número não cadastrado, ou tenant sem App configurado — ignora silenciosamente

      // Assinatura validada em tempo constante (timingSafeEqual) — mesma disciplina já usada
      // no restante da plataforma pra comparação de segredo/HMAC.
      const signatureHeader = request.headers.get('x-hub-signature-256') || ''
      const expected = 'sha256=' + createHmac('sha256', cred.meta_app_secret).update(rawBody).digest('hex')
      const sigBuf = Buffer.from(signatureHeader)
      const expBuf = Buffer.from(expected)
      const validSignature = sigBuf.length === expBuf.length && timingSafeEqual(sigBuf, expBuf)
      if (!validSignature) {
        console.error('[whatsapp-cloud-webhook] assinatura inválida para phone_number_id', phoneNumberId)
        continue
      }

      const messages: any[] = Array.isArray(value?.messages) ? value.messages : []
      const contactsMeta: any[] = Array.isArray(value?.contacts) ? value.contacts : []

      for (const msg of messages) {
        const fromPhone: string = (msg?.from || '').replace(/\D/g, '')
        if (!fromPhone) continue
        const msgText: string | null = msg?.text?.body ?? null
        const pushName: string | null =
          contactsMeta.find((c) => c?.wa_id === msg?.from)?.profile?.name ?? null

        await processInboundWhatsAppMessage({
          tenantId: cred.tenant_id,
          ownerClientId: cred.client_id ?? null,
          phone: fromPhone,
          pushName,
          text: msgText,
          externalMessageId: msg?.id ?? null,
        }).catch((err) => {
          console.error('[whatsapp-cloud-webhook] processInboundWhatsAppMessage falhou:', err)
        })
      }
    }
  }

  // Meta espera 200 rápido (senão reenvia o evento) — mesma convenção do webhook Evolution.
  return NextResponse.json({ ok: true })
}

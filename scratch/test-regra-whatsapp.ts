require('dotenv').config({ path: '.env.local' })
import pool from '@/lib/database/connection'
import { processInboundWhatsAppMessage } from '@/lib/whatsapp/inboundProcessor'
import { getLeadTimeline } from '@/lib/crm/leadTimeline'

const B = 'ea2a624f-7c50-48aa-b1b2-6878208a156c' // CRM + MARKETING DIGITAL (flag f, sem mensageria)
const C = 'c3fc15b7-7033-4e13-8e24-951c2e087dfb' // CRM SOZINHO (flag ligada só no teste, sem mensageria)
const D = '8c4de2ba-c41c-4353-9b38-491a9ce3e0cd' // Artemis9 - Testes (flag t, mensageria t)
const T0 = new Date().toISOString()
const results: [string, boolean, string][] = []
const check = (name: string, ok: boolean, info = '') => { results.push([name, ok, info]); console.log(ok ? 'PASS' : 'FAIL', name, info) }

async function count(sql: string, params: any[]) { return Number((await pool.query(sql, params)).rows[0].c) }

async function main() {
  // Destinos de CTA temporários para o ref resolver (apagados no fim)
  for (const [tid, slug] of [[B, 'teste-regra-b'], [C, 'teste-regra-c'], [D, 'teste-regra-d']] as const) {
    await pool.query(`INSERT INTO campanhasmarketingdigital."CtaDestination" (tenant_id, name, slug, type, cta_type, config) VALUES ($1, $2, $2, 'APP_FORM', 'LEARN_MORE', '{}') ON CONFLICT (slug) DO NOTHING`, [tid, slug])
  }
  await pool.query(`UPDATE public.tenants SET crm_gera_whatsapp = true WHERE id = $1`, [C])

  // ---- Cenário B: flag OFF, sem Mensageria ----
  const pOrg = '5581910000001', pCta = '5581910000002'
  const rOrg = await processInboundWhatsAppMessage({ tenantId: B, ownerClientId: null, phone: pOrg, pushName: 'Org', text: 'oi, tudo bem?', externalMessageId: 'b-org-1' , avatarUrl: null })
  check('B1 orgânico sem flag não gera lead', rOrg.leadUuid === null)
  check('B1 orgânico não grava na Mensageria', (await count(`SELECT count(*) c FROM mensageria.contacts WHERE tenant_id=$1 AND phone=$2`, [B, pOrg])) === 0)

  const rCta = await processInboundWhatsAppMessage({ tenantId: B, ownerClientId: null, phone: pCta, pushName: 'Cta', text: '[ref:teste-regra-b] quero saber mais', externalMessageId: 'b-cta-1', avatarUrl: null })
  check('B2 primeiro CTA gera lead', rCta.leadUuid !== null)
  check('B2 CTA sem flag não grava na Mensageria', (await count(`SELECT count(*) c FROM mensageria.contacts WHERE tenant_id=$1 AND phone=$2`, [B, pCta])) === 0)

  const rRe = await processInboundWhatsAppMessage({ tenantId: B, ownerClientId: null, phone: pCta, pushName: 'Cta', text: '[ref:teste-regra-b] de novo', externalMessageId: 'b-cta-2', avatarUrl: null })
  check('B3 re-contato de quem já é lead é ignorado', rRe.leadUuid === null)
  check('B3 continua 1 lead para o telefone', (await count(`SELECT count(*) c FROM public.leads_staging WHERE tenant_id=$1 AND RIGHT(regexp_replace(telefone,'\D','','g'),10)=RIGHT($2,10)`, [B, pCta])) === 1)

  // ---- Cenário C: flag ON, sem Mensageria ----
  const pC = '5581920000001'
  const rC1 = await processInboundWhatsAppMessage({ tenantId: C, ownerClientId: null, phone: pC, pushName: 'CC', text: '[ref:teste-regra-c] oi', externalMessageId: 'c-1', avatarUrl: null })
  check('C1 com flag ON, CTA gera lead', rC1.leadUuid !== null)
  check('C1 com flag ON, mensagem é gravada (dado para o CRM)', (await count(`SELECT count(*) c FROM mensageria.messages m JOIN mensageria.conversations cv ON cv.id=m.conversation_id JOIN mensageria.contacts ct ON ct.id=cv.contact_id WHERE ct.tenant_id=$1 AND ct.phone=$2`, [C, pC])) >= 1)
  const tl = await getLeadTimeline(C, rC1.leadUuid as string)
  check('C2 timeline mostra histórico sem o módulo Mensageria', tl.some(i => i.tipo === 'mensageria_message'))
  const bot = await count(`SELECT count(*) c FROM mensageria.messages m JOIN mensageria.conversations cv ON cv.id=m.conversation_id JOIN mensageria.contacts ct ON ct.id=cv.contact_id WHERE ct.tenant_id=$1 AND ct.phone=$2 AND m.direction='outbound'`, [C, pC])
  check('C3 sem módulo Mensageria o bot não responde', bot === 0, `outbound=${bot}`)

  // ---- Cenário D: flag ON + Mensageria (comportamento atual preservado) ----
  const pD = '5581930000001'
  const rD = await processInboundWhatsAppMessage({ tenantId: D, ownerClientId: null, phone: pD, pushName: 'DD', text: '[ref:teste-regra-d] oi', externalMessageId: 'd-1', avatarUrl: null })
  check('D1 com Mensageria, CTA gera lead', rD.leadUuid !== null)
  check('D1 com Mensageria, mensagem gravada', rD.mensageriaContactId !== null)

  // ---- Limpeza ----
  await pool.query(`UPDATE public.tenants SET crm_gera_whatsapp = false WHERE id = $1`, [C])
  const phones = [pOrg, pCta, pC, pD]
  const tenants = [B, C, D]
  await pool.query(`DELETE FROM public.lead_timeline WHERE lead_uuid IN (SELECT lead_uuid FROM public.leads_staging WHERE tenant_id = ANY($1::uuid[]) AND created_at >= $2)`, [tenants, T0])
  await pool.query(`DELETE FROM public.leads_staging WHERE tenant_id = ANY($1::uuid[]) AND created_at >= $2`, [tenants, T0])
  await pool.query(`DELETE FROM mensageria.contacts WHERE tenant_id = ANY($1::uuid[]) AND phone = ANY($2::text[])`, [tenants, phones])
  await pool.query(`DELETE FROM campanhasmarketingdigital."CtaSubmission" WHERE tenant_id = ANY($1::uuid[]) AND created_at >= $2`, [tenants, T0])
  await pool.query(`DELETE FROM campanhasmarketingdigital."CtaInteraction" WHERE tenant_id = ANY($1::uuid[]) AND created_at >= $2`, [tenants, T0])
  await pool.query(`DELETE FROM campanhasmarketingdigital."CtaDestination" WHERE slug IN ('teste-regra-b','teste-regra-c','teste-regra-d')`)
  const fails = results.filter(r => !r[1])
  console.log(`\n${results.length - fails.length}/${results.length} passaram`)
  process.exit(fails.length ? 1 : 0)
}
main().catch(e => { console.error('ERRO', e); process.exit(2) })

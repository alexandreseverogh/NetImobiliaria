require('dotenv').config({ path: '.env.local' })
import pool from '@/lib/database/connection'
import { processInboundWhatsAppMessage } from '@/lib/whatsapp/inboundProcessor'
import { getWhatsappPolicy } from '@/lib/crm/whatsappPolicy'

const B = 'ea2a624f-7c50-48aa-b1b2-6878208a156c' // CRM + MARKETING DIGITAL (CRM, sem Mensageria)
const C = 'c3fc15b7-7033-4e13-8e24-951c2e087dfb' // CRM SOZINHO (CRM, sem Mensageria)
const D = '8c4de2ba-c41c-4353-9b38-491a9ce3e0cd' // Artemis9 - Testes (CRM + Mensageria)
const N = 'f85bd520-5455-4c95-a93c-120b52fdfe6a' // Clinica Teste (sem módulos)
const results: [string, boolean][] = []
const check = (name: string, ok: boolean, info = '') => { results.push([name, ok]); console.log(ok ? 'PASS' : 'FAIL', name, info) }
const cnt = async (sql: string, p: any[]) => Number((await pool.query(sql, p)).rows[0].c)
const setFlag = (t: string, v: boolean) => pool.query(`UPDATE public.tenants SET gera_mensagens_whatsapp=$2 WHERE id=$1`, [t, v])
const setCrm = (t: string, v: boolean) => pool.query(`UPDATE public.tenant_modules SET is_enabled=$2 WHERE tenant_id=$1 AND module_id=(SELECT id FROM public.system_modules WHERE slug='crm')`, [t, v])

async function main() {
  const tag = Date.now().toString().slice(-6)
  const ph = (n: number) => `55819${String(Date.now() % 100000000 + n * 7).padStart(8, "0").slice(-8)}`
  const pB1 = ph(1), pB2 = ph(2), pC1 = ph(3), pD1 = ph(4), pE1 = ph(5), pF1 = ph(6)

  // Política por tenant
  check('P1 sem módulos, parâmetro ligado → desligado na prática', (await getWhatsappPolicy(N)).gerarMensagens === false) // N ainda com flag falsa
  await setFlag(N, true)
  const pN = await getWhatsappPolicy(N)
  check('P2 sem módulos, flag ligada no banco → efetivo OFF', pN.gerarMensagens === false && pN.criarLead === false)
  await setFlag(N, false)

  // Cenário b (CRM, flag OFF)
  const rB1 = await processInboundWhatsAppMessage({ tenantId: B, ownerClientId: null, phone: pB1, pushName: 'O', text: 'oi', externalMessageId: 'x-b1-' + tag, avatarUrl: null })
  check('B1 orgânico sem flag: sem lead', rB1.leadUuid === null)
  const rB2 = await processInboundWhatsAppMessage({ tenantId: B, ownerClientId: null, phone: pB2, pushName: 'C', text: '[ref:teste-regra-b] oi', externalMessageId: 'x-b2-' + tag, avatarUrl: null })
  check('B2 primeiro CTA sem flag: lead', rB2.leadUuid !== null)
  check('B2 sem flag: sem Mensageria', await cnt(`SELECT count(*) c FROM mensageria.contacts WHERE tenant_id=$1 AND phone=$2`, [B, pB2]) === 0)
  const rB3 = await processInboundWhatsAppMessage({ tenantId: B, ownerClientId: null, phone: pB2, pushName: 'C', text: '[ref:teste-regra-b] de novo', externalMessageId: 'x-b3-' + tag, avatarUrl: null })
  check('B3 re-contato sem flag: ignorado', rB3.leadUuid === null)

  // Cenário c (CRM, flag ON, sem Mensageria)
  await setFlag(C, true)
  const rC = await processInboundWhatsAppMessage({ tenantId: C, ownerClientId: null, phone: pC1, pushName: 'CC', text: '[ref:teste-regra-c] oi', externalMessageId: 'x-c1-' + tag, avatarUrl: null })
  check('C1 flag ON + CRM: lead', rC.leadUuid !== null)
  { const k = await cnt(`SELECT count(*) c FROM mensageria.contacts WHERE tenant_id=$1 AND phone=$2`, [C, pC1]); check('C1 flag ON sem Mensageria: mensagem guardada', k === 1, `phone=${pC1} count=${k}`) }
  await setFlag(C, false)

  // Cenário e (Mensageria SEM CRM, flag ON)
  await setFlag(D, true)
  await setCrm(D, false)
  try {
    const rE = await processInboundWhatsAppMessage({ tenantId: D, ownerClientId: null, phone: pE1, pushName: 'E', text: '[ref:teste-regra-d] oi', externalMessageId: 'x-e1-' + tag, avatarUrl: null })
    check('E1 Mensageria sem CRM: sem lead', rE.leadUuid === null)
    check('E1 Mensageria sem CRM: mensagem na Mensageria', await cnt(`SELECT count(*) c FROM mensageria.contacts WHERE tenant_id=$1 AND phone=$2`, [D, pE1]) === 1)
    const rE2 = await processInboundWhatsAppMessage({ tenantId: D, ownerClientId: null, phone: pF1, pushName: 'F', text: 'sem ref', externalMessageId: 'x-e2-' + tag, avatarUrl: null })
    check('E2 Mensageria sem CRM, orgânica: sem lead, grava', rE2.leadUuid === null && (await cnt(`SELECT count(*) c FROM mensageria.contacts WHERE tenant_id=$1 AND phone=$2`, [D, pF1])) === 1)
  } finally {
    await setCrm(D, true)
    await setFlag(D, true)
  }

  console.log(`\n${results.filter(r => r[1]).length}/${results.length} passaram`)
  console.log(`Telefones de teste: ${[pB1, pB2, pC1, pD1, pE1, pF1].join(', ')}`)
  process.exit(results.every(r => r[1]) ? 0 : 1)
}
main().catch(async e => { console.error('ERRO', e); await setCrm(D, true); await setFlag(C, false); process.exit(2) })

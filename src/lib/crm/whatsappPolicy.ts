import pool from '@/lib/database/connection'

/**
 * Política de WhatsApp por tenant (decisão de 2026-11-16).
 *
 * GERA_MENSAGENS_WHATSAPP (tenants.gera_mensagens_whatsapp) — editável só pelo Master e só
 * ligável quando o tenant tem CRM, Mensageria ou ambos. Efetivo apenas com um desses módulos.
 *
 * gerarMensagens   — grava as mensagens no modelo da Mensageria.
 *                    = parâmetro ligado E (CRM ou Mensageria contratado), OU Mensageria contratada.
 * criarLead        — cria/atualiza lead no CRM. Exige o módulo CRM contratado.
 * mensageriaContratada — exibição na Mensageria (o bot só responde com ela).
 *
 * Cenários:
 *  a) só CRM               → sem parâmetro: nada de WhatsApp
 *  b) Mkt + CRM, sem param → só o primeiro CTA gera lead; nada de mensagens
 *  c) Mkt + CRM, com param → lead + histórico; mensagens guardadas, sem exibição na Mensageria
 *  d) c + Mensageria       → tudo acima + exibição na Mensageria
 *  e) Mensageria, sem CRM  → com parâmetro: mensagens na Mensageria, sem lead no CRM
 */
export interface WhatsappPolicy {
  gerarHistorico: boolean
  gerarMensagens: boolean
  criarLead: boolean
  mensageriaContratada: boolean
  crmContratado: boolean
}

const OFF: WhatsappPolicy = { gerarHistorico: false, gerarMensagens: false, criarLead: false, mensageriaContratada: false, crmContratado: false }

export async function getWhatsappPolicy(tenantId: string): Promise<WhatsappPolicy> {
  const { rows } = await pool.query(
    `SELECT t.gera_mensagens_whatsapp AS gera,
            EXISTS (
              SELECT 1 FROM public.tenant_modules tm
                JOIN public.system_modules sm ON sm.id = tm.module_id
               WHERE tm.tenant_id = t.id AND sm.slug = 'mensageria' AND tm.is_enabled = true
            ) AS mensageria,
            EXISTS (
              SELECT 1 FROM public.tenant_modules tm
                JOIN public.system_modules sm ON sm.id = tm.module_id
               WHERE tm.tenant_id = t.id AND sm.slug = 'crm' AND tm.is_enabled = true
            ) AS crm
       FROM public.tenants t
      WHERE t.id = $1::uuid`,
    [tenantId],
  )
  const row = rows[0]
  if (!row) return OFF
  const mensageria = row.mensageria === true
  const crm = row.crm === true
  // Regra: com a Mensageria contratada, o GERA é obrigatoriamente ligado (sem ele as mensagens
  // não chegam à Mensageria). Sem Mensageria, o GERA vale só com CRM contratado.
  const gera = mensageria ? true : (row.gera === true && crm)
  return {
    gerarHistorico: gera,
    gerarMensagens: gera || mensageria,
    criarLead: crm,
    mensageriaContratada: mensageria,
    crmContratado: crm,
  }
}

/** Já existe lead deste telefone no tenant? Mesma comparação do Match Engine (últimos 10 dígitos). */
export async function leadExistsForPhone(tenantId: string, phone: string): Promise<boolean> {
  const { rows } = await pool.query(
    `SELECT 1 FROM public.leads_staging
      WHERE tenant_id = $1::uuid
        AND telefone IS NOT NULL
        AND RIGHT(regexp_replace(telefone, '\D', '', 'g'), 10) = RIGHT(regexp_replace($2::text, '\D', '', 'g'), 10)
      LIMIT 1`,
    [tenantId, phone],
  )
  return rows.length > 0
}

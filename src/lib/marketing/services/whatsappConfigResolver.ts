/**
 * Resolução do número de WhatsApp usado no redirect de CTA de anúncio (`/api/r/[trackingId]`)
 * — achado real investigado a pedido do usuário (2026-10-26/27): esse número vivia numa tabela
 * (`campanhasmarketingdigital."WhatsAppConfig"`) que nunca tinha escopo por cliente, mesmo
 * quando a campanha pertencia a um cliente real gerenciado pelo tenant — toda campanha,
 * própria ou de qualquer cliente, sempre caía no único registro "padrão" do tenant.
 *
 * Fonte única de verdade pra essa cascata — reusada por:
 * - `GET/PUT/DELETE /api/admin/campanhas/settings/whatsapp` (tela de configuração)
 * - `/api/r/[trackingId]/route.ts` (o redirect real que o Meta chama no clique do anúncio)
 *
 * Mesma convenção já usada em `resolveWhatsAppInbox`/`resolveSlaPolicy`/`resolvePromptTemplate`
 * nesta mesma frente: client_id setado tem prioridade; client_id NULL = aplica a todo o tenant.
 */
import pool from '@/lib/database/connection'
import { normalizeBrazilianMobile } from '@/lib/whatsapp/inboundProcessor'
import { resolveWhatsAppProvider } from '@/lib/mensageria/inboxes'

export interface ResolvedWhatsAppConfig {
  id: string
  phoneNumber: string
  defaultMessage: string
  businessName: string | null
  /** De qual nível a config efetiva veio — nunca client_id != null com scope='tenant'. */
  scope: 'client' | 'tenant'
}

/**
 * Resolve a config de WhatsApp efetiva pra um escopo (tenant, cliente opcional).
 * Prioridade: linha do cliente (se `clientId` informado e existir) → linha tenant-wide
 * (`client_id IS NULL`) → `null` (nenhuma config em nenhum nível, tenant nunca configurou).
 */
export async function resolveWhatsAppConfig(
  tenantId: string,
  clientId?: string | null,
): Promise<ResolvedWhatsAppConfig | null> {
  if (clientId) {
    const { rows } = await pool.query(
      `SELECT id, "phoneNumber", "defaultMessage", "businessName"
         FROM campanhasmarketingdigital."WhatsAppConfig"
        WHERE tenant_id = $1 AND client_id = $2
        LIMIT 1`,
      [tenantId, clientId],
    )
    if (rows[0]) {
      return {
        id: rows[0].id,
        phoneNumber: rows[0].phoneNumber,
        defaultMessage: rows[0].defaultMessage,
        businessName: rows[0].businessName ?? null,
        scope: 'client',
      }
    }
  }

  const { rows: tenantRows } = await pool.query(
    `SELECT id, "phoneNumber", "defaultMessage", "businessName"
       FROM campanhasmarketingdigital."WhatsAppConfig"
      WHERE tenant_id = $1 AND client_id IS NULL
      LIMIT 1`,
    [tenantId],
  )
  if (!tenantRows[0]) return null
  return {
    id: tenantRows[0].id,
    phoneNumber: tenantRows[0].phoneNumber,
    defaultMessage: tenantRows[0].defaultMessage,
    businessName: tenantRows[0].businessName ?? null,
    scope: 'tenant',
  }
}

/**
 * Resolve o número REAL que de fato recebe mensagem nesta Mensageria (Achado #3), seja qual
 * for o provider — Evolution (instância pareada) OU WhatsApp Cloud API oficial (achado #4,
 * docs/PLANO_WHATSAPP_CLOUD_API_PROVIDER.md). Antes desta extensão (seção 9.4 do plano), esta
 * função só sabia olhar Evolution — um tenant/cliente que migrasse pra Cloud API ficava com o
 * aviso de "número não bate" sempre cego (sempre `null`, nunca comparava nada de verdade),
 * mesmo com um número Cloud API real configurado.
 *
 * Mesma cascata de `resolveWhatsAppInbox`/`resolveWhatsAppProvider`: resolve o provider
 * escolhido pro escopo primeiro (excludente, nunca os dois), só então busca o número na fonte
 * certa. `null` = nenhum nível tem número configurado pro provider escolhido (não dá pra
 * comparar nada, nunca "não bate" por omissão).
 */
export async function resolveEvolutionPairedNumber(
  tenantId: string,
  clientId?: string | null,
): Promise<string | null> {
  const provider = await resolveWhatsAppProvider(tenantId, clientId)

  if (provider === 'whatsapp_cloud') {
    const { rows } = await pool.query(
      `SELECT display_phone_number
         FROM mensageria.whatsapp_cloud_credentials
        WHERE tenant_id = $1 AND is_active = true
          AND (client_id = $2::uuid OR client_id IS NULL)
        ORDER BY client_id NULLS LAST
        LIMIT 1`,
      [tenantId, clientId ?? null],
    )
    return rows[0]?.display_phone_number || null
  }

  if (clientId) {
    const { rows } = await pool.query(
      `SELECT numero_whatsapp, evolution_instance FROM public.clientes WHERE uuid = $1 AND tenant_id = $2`,
      [clientId, tenantId],
    )
    const c = rows[0]
    if (c?.evolution_instance) return c.numero_whatsapp || null
  }

  const { rows } = await pool.query(
    `SELECT numero_whatsapp, evolution_instance FROM public.tenants WHERE id = $1`,
    [tenantId],
  )
  const t = rows[0]
  if (t?.evolution_instance) return t.numero_whatsapp || null
  return null
}

/**
 * Compara 2 números de WhatsApp de forma tolerante a formatação (DDI, 9º dígito, espaços).
 * `null` = não dá pra comparar (pelo menos um dos dois está vazio/ausente) — nunca "não bate".
 */
export function whatsappNumbersMatch(a: string | null | undefined, b: string | null | undefined): boolean | null {
  if (!a || !b) return null
  return normalizeBrazilianMobile(a) === normalizeBrazilianMobile(b)
}

import pool from '@/lib/database/connection'

/**
 * Normaliza um domínio para comparação: minúsculo, sem protocolo, caminho, porta, "www." e ponto final.
 * "https://WWW.Imobiliaria.com.br:443/x" -> "imobiliaria.com.br"
 */
export function normalizePublicDomain(input: string): string {
  let d = input.trim().toLowerCase()
  d = d.replace(/^https?:\/\//, '')
  d = d.split('/')[0]
  d = d.replace(/:\d+$/, '')
  d = d.replace(/\.$/, '')
  d = d.replace(/^www\./, '')
  return d
}

/**
 * Resolve o tenant dono do domínio público da requisição. Retorna null se o domínio não
 * estiver cadastrado. Nunca usa tenant padrão: sem domínio cadastrado, não há empresa.
 */
export async function resolveTenantByPublicHost(host: string | null | undefined): Promise<string | null> {
  if (!host) return null
  const domain = normalizePublicDomain(host)
  if (!domain) return null
  const { rows } = await pool.query(
    `SELECT id FROM public.tenants WHERE public_domain = $1 LIMIT 1`,
    [domain],
  )
  return rows[0]?.id ?? null
}

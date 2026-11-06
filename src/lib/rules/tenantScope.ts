/**
 * Garante que toda decisão de roteamento/regra opere dentro de um tenant explícito.
 * Substitui o tenant padrão fixo que existia em distributionEngine (ver plano §4.7).
 */
export function requireTenantId(tenantId: string | null | undefined): string {
  const t = (tenantId ?? '').trim()
  if (!t) {
    throw new Error('tenant_id obrigatório: decisão de roteamento sem tenant é proibida')
  }
  return t
}

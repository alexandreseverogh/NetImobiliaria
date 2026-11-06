/**
 * Tenant cujos parâmetros (valor do corretor, PIX, SLA exibidos) alimentam as rotas PÚBLICAS
 * /api/public/corretor/* — que não têm sessão nem tenant de contexto.
 *
 * Vem de PUBLIC_PARAMS_TENANT_ID (configuração de deploy, nunca literal no código). Sem essa
 * variável a rota falha explicitamente: ler "um tenant qualquer" expunha dados de outra empresa.
 */
export function getPublicParamsTenantId(): string {
  const id = (process.env.PUBLIC_PARAMS_TENANT_ID ?? '').trim()
  if (!id) {
    throw new Error('PUBLIC_PARAMS_TENANT_ID não configurado: as rotas públicas de parâmetros do corretor precisam de um tenant explícito')
  }
  return id
}

import pool from '@/lib/database/connection';

/**
 * Fonte única de "quais redes estão contratadas agora pra este tenant" — reaproveita o
 * mesmo modelo de provisionamento já usado em GET /api/admin/campanhas/configuracoes/redes
 * (system_features + tenant_feature_overrides, slug 'campanhas-rede-<code>'), extraído pra
 * cá porque agora tem 2 consumidores reais além daquela rota:
 *
 * 1. Camada de coleta (syncMetrics cron + sync manual) — nunca sincronizar rede não
 *    contratada, mesmo que a credencial ainda esteja ativa no banco (ex.: tenant teve a
 *    rede provisionada no passado, contrato foi encerrado, credencial nunca foi apagada).
 * 2. Badge de "rede descontinuada" no dashboard — dado histórico de uma rede não mais
 *    contratada continua entrando nos cálculos (decisão deliberada — nunca escondido
 *    retroativamente), mas o usuário precisa ser avisado quando isso está acontecendo.
 *
 * Sem bypass de Master aqui de propósito — ao contrário da rota de configuração, isto não é
 * um gate de visibilidade de tela, é o estado real de faturamento/contratação do tenant, e
 * precisa refletir a verdade mesmo quando consultado em contexto sem usuário logado (cron).
 */
export async function getProvisionedNetworkCodes(tenantId: string): Promise<Set<string>> {
  const { rows } = await pool.query(
    `SELECT n.code, COALESCE(tfo.is_active, false) AS contracted
       FROM public.ad_networks n
       LEFT JOIN public.system_features sf
         ON sf.slug = 'campanhas-rede-' || n.code
       LEFT JOIN public.tenant_feature_overrides tfo
         ON tfo.feature_id = sf.id AND tfo.tenant_id = $1::uuid
      WHERE n.code <> 'linkedin'`,
    [tenantId],
  );
  return new Set(rows.filter((r: any) => r.contracted).map((r: any) => r.code as string));
}

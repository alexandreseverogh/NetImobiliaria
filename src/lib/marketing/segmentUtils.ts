import pool from '@/lib/database/connection';

const S = 'campanhasmarketingdigital';

/**
 * Retorna os IDs de campanhas do tenant cujo segmento efetivo corresponde ao segmentId.
 *
 * Segmento efetivo de uma campanha:
 *   - Se tem client_id → public.clientes.segment_id daquele cliente
 *   - Se client_id IS NULL → public.tenants.segment_id do tenant
 *
 * Quando clientId é fornecido:
 *   - 'own'  → só campanhas sem client_id (segmento do tenant)
 *   - uuid   → só campanhas daquele cliente
 *   - null/undefined → todas as campanhas do segmento
 */
export async function resolveCampaignIdsBySegment(
  tenantId: string,
  segmentId: string,
  clientId?: string | null,
): Promise<string[]> {
  const params: any[] = [tenantId, segmentId];
  let clientClause = '';

  if (clientId === 'own') {
    clientClause = `AND cam."client_id" IS NULL`;
  } else if (clientId) {
    params.push(clientId);
    clientClause = `AND cam."client_id" = $${params.length}::uuid`;
  }

  const { rows } = await pool.query(
    `SELECT cam.id
     FROM ${S}."Campaign" cam
     LEFT JOIN public.clientes cl ON cl.uuid = cam."client_id"
     LEFT JOIN public.tenants  t  ON t.id    = cam."tenant_id"
     WHERE cam."tenant_id" = $1::uuid
       AND COALESCE(cl.segment_id, t.segment_id) = $2::uuid
       ${clientClause}`,
    params,
  );

  return rows.map((r: any) => r.id);
}

/**
 * getMetaPixelId — busca o pixel_id do Meta nas credenciais do tenant.
 *
 * Prioridade:
 *   1. tenant_network_credentials.credentials->>'pixel_id'  (configurado via Settings)
 *   2. Vazio string (sem pixel configurado — componente renderiza null)
 *
 * Uso em Server Components / layouts server-side.
 */

import pool from '@/lib/database/connection';

export async function getMetaPixelId(tenantId: string): Promise<string> {
  try {
    const res = await pool.query<{ pixel_id: string }>(
      `SELECT tnc.credentials->>'pixel_id' AS pixel_id
       FROM public.tenant_network_credentials tnc
       JOIN public.ad_networks n ON n.id = tnc.network_id
       WHERE tnc.tenant_id = $1::uuid
         AND n.code = 'meta'
         AND tnc.is_active = true
       LIMIT 1`,
      [tenantId],
    );
    return res.rows[0]?.pixel_id || '';
  } catch {
    // Falha silenciosa — pixel ausente nunca deve quebrar a página
    return '';
  }
}

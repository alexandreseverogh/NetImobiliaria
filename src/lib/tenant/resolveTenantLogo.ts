/**
 * resolveTenantLogo — resolve a logomarca real do tenant (a mesma exibida no header do
 * painel admin, ver `AdminHeader.tsx`/`getLogo()`) para uso em páginas públicas.
 *
 * Prioridade, igual ao login (`/api/admin/auth/login`):
 *   1. tenants.logo_url  (string — data URI ou URL http já pronta)
 *   2. tenants.logo      (bytea — convertido para data URI com logo_mime_type)
 *   3. null — tenant sem logo próprio configurado; NUNCA cai no fallback da
 *      plataforma (Artemis4) aqui, pra não exibir marca da plataforma numa
 *      página pública de um imóvel de outra empresa.
 *
 * Uso em Server Components / API routes públicas.
 */

import pool from '@/lib/database/connection';

export async function resolveTenantLogo(tenantId: string | null | undefined): Promise<string | null> {
  if (!tenantId) return null;

  try {
    const res = await pool.query<{ logo: Buffer | string | null; logo_url: string | null; logo_mime_type: string | null }>(
      `SELECT logo, logo_url, logo_mime_type FROM public.tenants WHERE id = $1::uuid LIMIT 1`,
      [tenantId],
    );

    const tenant = res.rows[0];
    if (!tenant) return null;

    if (tenant.logo_url) {
      return tenant.logo_url;
    }

    if (!tenant.logo) return null;

    if (typeof tenant.logo === 'string' && tenant.logo.startsWith('data:image')) {
      return tenant.logo;
    }

    const buffer = Buffer.isBuffer(tenant.logo)
      ? tenant.logo
      : (typeof tenant.logo === 'string' && tenant.logo.startsWith('\\x'))
        ? Buffer.from(tenant.logo.substring(2), 'hex')
        : Buffer.from(tenant.logo as any);

    return `data:${tenant.logo_mime_type || 'image/png'};base64,${buffer.toString('base64')}`;
  } catch {
    // Falha silenciosa — logo ausente/erro de leitura nunca deve quebrar a página pública
    return null;
  }
}

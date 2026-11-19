/**
 * GET/POST/PUT/DELETE /api/admin/master/evolution-servers
 * Servidores Evolution da plataforma. Só o Master. A chave de administração nunca é devolvida
 * completa para a tela (apenas um indicador de que está preenchida).
 */
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

async function requireMaster(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;
  if (!decoded || !decoded.is_system_role) return null;
  return decoded;
}

const URL_RE = /^https?:\/\/[^\s]+$/;

export async function GET(request: NextRequest) {
  if (!(await requireMaster(request))) return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });

  // Lista de empresas de um servidor (usada no modal de detalhe).
  const tenantsOf = new URL(request.url).searchParams.get('tenantsOf');
  if (tenantsOf) {
    const { rows } = await pool.query(
      `SELECT id, name, (evolution_instance IS NOT NULL) AS connected
         FROM public.tenants WHERE evolution_server_id = $1 ORDER BY name ASC`,
      [tenantsOf],
    );
    return NextResponse.json({ tenants: rows });
  }

  const { rows } = await pool.query(`
    SELECT s.id, s.name, s.api_url, (s.api_key IS NOT NULL AND s.api_key <> '') AS has_key,
           s.is_default, s.is_active,
           (SELECT count(*)::int FROM public.tenants t WHERE t.evolution_server_id = s.id) AS tenant_count,
           (SELECT count(*)::int FROM public.tenants t
             WHERE t.evolution_server_id = s.id AND t.evolution_instance IS NOT NULL) AS instance_count,
           (SELECT count(*)::int FROM public.tenants t
             WHERE t.evolution_server_id = s.id AND t.evolution_disconnected_at IS NOT NULL) AS disconnected_count,
           s.last_reachable, s.last_checked_at
      FROM public.evolution_servers s
     ORDER BY s.is_default DESC, s.name ASC
  `);
  return NextResponse.json({ servers: rows });
}

export async function POST(request: NextRequest) {
  if (!(await requireMaster(request))) return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  const body = await request.json();
  const name = String(body.name || '').trim();
  const apiUrl = String(body.apiUrl || '').trim().replace(/\/$/, '');
  const apiKey = String(body.apiKey || '').trim();
  if (!name || !apiUrl || !apiKey) return NextResponse.json({ error: 'Nome, URL e chave são obrigatórios' }, { status: 400 });
  if (!URL_RE.test(apiUrl)) return NextResponse.json({ error: 'URL inválida (use http:// ou https://)' }, { status: 400 });

  const isDefault = !!body.isDefault;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (isDefault) await client.query(`UPDATE public.evolution_servers SET is_default = false WHERE is_default = true`);
    await client.query(
      `INSERT INTO public.evolution_servers (name, api_url, api_key, is_default, is_active) VALUES ($1,$2,$3,$4,true)`,
      [name, apiUrl, apiKey, isDefault],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return NextResponse.json({ success: true }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  if (!(await requireMaster(request))) return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  const body = await request.json();
  const id = String(body.id || '');
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (body.isDefault === true) {
      await client.query(`UPDATE public.evolution_servers SET is_default = false WHERE is_default = true AND id <> $1`, [id]);
    }
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (body.name !== undefined) { vals.push(String(body.name).trim()); sets.push(`name = $${vals.length}`); }
    if (body.apiUrl !== undefined) {
      const u = String(body.apiUrl).trim().replace(/\/$/, '');
      if (!URL_RE.test(u)) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'URL inválida' }, { status: 400 }); }
      vals.push(u); sets.push(`api_url = $${vals.length}`);
    }
    // Chave só é trocada se vier preenchida (tela não reenvia a chave atual).
    if (body.apiKey) { vals.push(String(body.apiKey).trim()); sets.push(`api_key = $${vals.length}`); }
    if (body.isDefault !== undefined) { vals.push(!!body.isDefault); sets.push(`is_default = $${vals.length}`); }
    if (body.isActive !== undefined) { vals.push(!!body.isActive); sets.push(`is_active = $${vals.length}`); }
    if (sets.length) {
      vals.push(id);
      await client.query(`UPDATE public.evolution_servers SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals);
    }
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  if (!(await requireMaster(request))) return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  const id = new URL(request.url).searchParams.get('id') || '';
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });
  const { rows } = await pool.query(`SELECT count(*)::int AS n FROM public.tenants WHERE evolution_server_id = $1`, [id]);
  if (rows[0].n > 0) {
    return NextResponse.json({ error: `Este servidor atende ${rows[0].n} empresa(s). Desative em vez de excluir.` }, { status: 409 });
  }
  await pool.query(`DELETE FROM public.evolution_servers WHERE id = $1`, [id]);
  return NextResponse.json({ success: true });
}

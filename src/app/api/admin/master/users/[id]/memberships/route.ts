import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

/**
 * API de Memberships de Usuário (Master)
 * Gerencia o vínculo de usuários com múltiplos tenants
 */

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !(decoded as any).is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const { id: userId } = params;

  try {
    const query = `
      SELECT 
        utm.id,
        utm.user_id,
        utm.tenant_id,
        utm.role_id,
        utm.is_active,
        utm.is_owner,
        utm.joined_at,
        utm.last_access,
        t.name as tenant_name,
        t.slug as tenant_slug,
        r.name as role_name
      FROM user_tenant_membership utm
      JOIN tenants t ON utm.tenant_id = t.id
      LEFT JOIN user_roles r ON utm.role_id = r.id
      WHERE utm.user_id = $1
      ORDER BY t.name ASC
    `;
    const result = await pool.query(query, [userId]);
    return NextResponse.json({ memberships: result.rows });
  } catch (error: any) {
    console.error('Error fetching user memberships:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !(decoded as any).is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const { id: userId } = params;
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { tenant_id, role_id, is_owner, is_active } = body;

  if (!tenant_id) {
    return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const denied = await requireApiPermission(request, 'master', 'ADMIN')
    if (denied) return denied

    await client.query('BEGIN');
    
    // Upsert membership
    const query = `
      INSERT INTO user_tenant_membership 
        (user_id, tenant_id, role_id, is_owner, is_active, joined_at)
      VALUES ($1, $2, $3, $4, COALESCE($5, true), NOW())
      ON CONFLICT (user_id, tenant_id) DO UPDATE SET
        role_id = EXCLUDED.role_id,
        is_owner = EXCLUDED.is_owner,
        is_active = EXCLUDED.is_active,
        joined_at = COALESCE(user_tenant_membership.joined_at, NOW())
      RETURNING *
    `;
    const result = await client.query(query, [
      userId, 
      tenant_id, 
      role_id || null, 
      is_owner || false, 
      is_active
    ]);

    await client.query('COMMIT');
    return NextResponse.json({ 
      success: true, 
      membership: result.rows[0] 
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating user membership:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !(decoded as any).is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const { id: userId } = params;
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');

  if (!tenantId) {
    return NextResponse.json({ error: 'Tenant ID is required for disassociation' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const denied = await requireApiPermission(request, 'master', 'ADMIN')
    if (denied) return denied

    await client.query('BEGIN');

    const result = await client.query(
      'DELETE FROM user_tenant_membership WHERE user_id = $1 AND tenant_id = $2 RETURNING *',
      [userId, tenantId]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true, message: 'Membership removed successfully' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error deleting membership:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const { id } = params;

  try {
    const query = `
      SELECT sm.*, 
             CASE WHEN tm.tenant_id IS NOT NULL THEN true ELSE false END as assigned
      FROM system_modules sm
      LEFT JOIN tenant_modules tm ON sm.id = tm.module_id AND tm.tenant_id = $1
      ORDER BY sm.name ASC
    `;
    const result = await pool.query(query, [id]);
    return NextResponse.json({ modules: result.rows });
  } catch (error: any) {
    console.error('Error fetching tenant modules:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const { id } = params;
  const client = await pool.connect();

  try {
    const denied = await requireApiPermission(request, 'master', 'ADMIN')
    if (denied) return denied

    const body = await request.json();
    const { moduleIds } = body;

    if (!Array.isArray(moduleIds)) {
      return NextResponse.json({ error: 'moduleIds deve ser um array' }, { status: 400 });
    }

    await client.query('BEGIN');

    // 1. Remover módulos atuais
    await client.query('DELETE FROM tenant_modules WHERE tenant_id = $1', [id]);

    // 2. Inserir novos módulos
    if (moduleIds.length > 0) {
      for (const moduleId of moduleIds) {
        await client.query(
          'INSERT INTO tenant_modules (tenant_id, module_id) VALUES ($1, $2)',
          [id, moduleId]
        );
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (client) await client.query('ROLLBACK');
    console.error('Error updating tenant modules:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
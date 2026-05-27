import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import pool from '@/lib/database/connection';

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
    // Busca todas as categorias para estruturar o retorno
    const categoriesResult = await pool.query('SELECT * FROM system_categorias ORDER BY name ASC');
    
    // Busca todas as features com seus módulos e overrides do tenant
    const query = `
      SELECT 
        sf.*,
        sc.name as category_name,
        ARRAY_AGG(sfm.module_id) FILTER (WHERE sfm.module_id IS NOT NULL) as module_ids,
        EXISTS (
          SELECT 1 FROM tenant_modules tm 
          JOIN system_feature_modules fm ON tm.module_id = fm.module_id
          WHERE tm.tenant_id = $1 AND fm.feature_id = sf.id
        ) as inherited_from_module,
        tfo.is_active as override_status
      FROM system_features sf
      LEFT JOIN system_categorias sc ON sf.category_id = sc.id
      LEFT JOIN system_feature_modules sfm ON sf.id = sfm.feature_id
      LEFT JOIN tenant_feature_overrides tfo ON sf.id = tfo.feature_id AND tfo.tenant_id = $1
      GROUP BY sf.id, sc.name, tfo.is_active
      ORDER BY sc.name ASC, sf.name ASC
    `;
    
    const featuresResult = await pool.query(query, [id]);

    return NextResponse.json({ 
      categories: categoriesResult.rows,
      features: featuresResult.rows 
    });
  } catch (error: any) {
    console.error('Error fetching tenant features:', error);
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
    const { overrides } = body; // Array de { featureId, isActive }

    if (!Array.isArray(overrides)) {
      return NextResponse.json({ error: 'overrides deve ser um array' }, { status: 400 });
    }

    await client.query('BEGIN');

    // Remove overrides antigos
    await client.query('DELETE FROM tenant_feature_overrides WHERE tenant_id = $1', [id]);

    if (overrides.length > 0) {
      for (const override of overrides) {
        if (override.isActive !== null && override.isActive !== undefined) { 
          await client.query(
            'INSERT INTO tenant_feature_overrides (tenant_id, feature_id, is_active) VALUES ($1, $2, $3)',
            [id, override.featureId, override.isActive]
          );
        }
      }
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (client) await client.query('ROLLBACK');
    console.error('Error updating tenant features:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
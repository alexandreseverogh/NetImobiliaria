import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !(decoded as any).is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const { id: moduleId } = params;

  try {
    // Busca TODAS as categorias e marca quais pertencem a este módulo
    const query = `
      SELECT 
        sc.id, 
        sc.name, 
        sc.icon,
        (sc.module_id = $1) as is_assigned,
        sc.module_id,
        sm.name as current_module_name,
        (
          SELECT COUNT(*) 
          FROM system_features sf 
          WHERE sf.category_id = sc.id
        )::INT as features_count
      FROM system_categorias sc
      LEFT JOIN system_modules sm ON sc.module_id = sm.id
      ORDER BY sc.name ASC
    `;
    const result = await pool.query(query, [moduleId]);
    
    return NextResponse.json({ 
      success: true, 
      categories: result.rows 
    });
  } catch (error: any) {
    console.error('Error fetching module categories map:', error);
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

  const { id: moduleId } = params;
  const body = await request.json();
  const { category_ids } = body; 

  if (!Array.isArray(category_ids)) {
    return NextResponse.json({ error: 'Lista de IDs inválida' }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const denied = await requireApiPermission(request, 'master', 'ADMIN')
    if (denied) return denied
    await client.query('BEGIN');

    // Remove este módulo de todas as categorias que o tinham
    await client.query('UPDATE system_categorias SET module_id = NULL WHERE module_id = $1', [moduleId]);

    // Associa o módulo às categorias selecionadas
    if (category_ids.length > 0) {
      await client.query(
        'UPDATE system_categorias SET module_id = $1 WHERE id = ANY($2::int[])',
        [moduleId, category_ids]
      );
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true, message: 'Arquitetura de categorias do motor sincronizada com sucesso' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error syncing module categories:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  try {
    const query = `
      SELECT 
        m.*,
        (
          SELECT COUNT(*)::INT 
          FROM system_categorias sc 
          WHERE sc.module_id = m.id
        ) as category_count
      FROM system_modules m
      ORDER BY m.name ASC
    `;
    const result = await pool.query(query);
    return NextResponse.json({ modules: result.rows });
  } catch (error: any) {
    console.error('Error fetching modules:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // O Authorization da página admin_auth_token ou header Authorization
  const authHeader = request.headers.get('authorization');
  let token = null;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    token = request.cookies.get('admin_auth_token')?.value;
  }
  
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  try {
    const denied = await requireApiPermission(request, 'master', 'ADMIN')
    if (denied) return denied
    const body = await request.json();
    const { name, slug, description, icon, is_active } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Nome e Slug são obrigatórios' }, { status: 400 });
    }

    const query = `
      INSERT INTO system_modules (name, slug, description, icon, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      name,
      slug.toLowerCase().replace(/\s/g, '-'),
      description || null,
      icon || 'cube',
      is_active !== undefined ? is_active : true
    ];

    const result = await pool.query(query, values);
    
    return NextResponse.json({ success: true, module: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating module:', error);
    // Verificar se é erro de unicidade do slug
    if (error.code === '23505' && error.constraint?.includes('slug')) {
      return NextResponse.json({ error: 'Este identificador (slug) já está em uso.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erro ao criar módulo: ' + error.message }, { status: 500 });
  }
}
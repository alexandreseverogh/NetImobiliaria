import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import pool from '@/lib/database/connection';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  try {
    // 1. Buscar todas as features com seus respectivos módulos (N:N)
    const featuresQuery = `
      SELECT 
        sf.*, 
        sc.name as category_name,
        srt.tag_key as filter_role_tag,
        COALESCE(array_agg(sm.id) FILTER (WHERE sm.id IS NOT NULL), '{}') as module_ids,
        COALESCE(string_agg(sm.name, ', ') FILTER (WHERE sm.name IS NOT NULL), '') as module_names
      FROM system_features sf
      LEFT JOIN system_categorias sc ON sf.category_id = sc.id
      LEFT JOIN system_feature_modules sfm ON sf.id = sfm.feature_id
      LEFT JOIN system_modules sm ON sfm.module_id = sm.id
      LEFT JOIN system_role_tags srt ON sf.filter_role_tag_id = srt.id
      WHERE sf.is_active = true OR sf.is_active = false
      GROUP BY sf.id, sc.name, sc.sort_order, srt.tag_key
      ORDER BY sc.sort_order ASC, sc.name ASC, sf.sort_order ASC, sf.name ASC
    `;
    
    // 2. Buscar módulos disponíveis
    const modulesQuery = `SELECT id, name FROM system_modules WHERE is_active = true ORDER BY name ASC`;
    
    // 3. Buscar categorias disponíveis
    const categoriesQuery = `
      SELECT c.id, c.name, m.id as module_id, m.name as module_name 
      FROM system_categorias c
      LEFT JOIN system_modules m ON c.module_id = m.id
      ORDER BY m.name ASC, c.name ASC
    `;
    
    // 4. Buscar Tags de Sistema disponíveis
    const tagsQuery = `SELECT id, tag_key, display_name FROM system_role_tags ORDER BY display_name ASC`;

    const [featuresRes, modulesRes, categoriesRes, tagsRes] = await Promise.all([
      pool.query(featuresQuery),
      pool.query(modulesQuery),
      pool.query(categoriesQuery),
      pool.query(tagsQuery)
    ]);

    return NextResponse.json({
      success: true,
      features: featuresRes.rows,
      availableModules: modulesRes.rows,
      availableCategories: categoriesRes.rows,
      availableTags: tagsRes.rows
    });
  } catch (error: any) {
    console.error('Error listing global features:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  try {
    const denied = await requireApiPermission(request, 'master', 'ADMIN')
    if (denied) return denied
    const body = await request.json();
    const {
      name,
      description,
      category_id,
      url,
      slug, 
      is_active, 
      is_default_tenant_admin_feature,
      sort_order,
      module_ids,
      icon,
      semantic_mapping
    } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'Name and Slug are required' }, { status: 400 });
    }

    const query = `
      INSERT INTO system_features (
        name, 
        description, 
        category_id, 
        url, 
        slug, 
        is_active, 
        is_default_tenant_admin_feature,
        sort_order,
        icon,
        semantic_mapping
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      name, 
      description || null, 
      category_id || null, 
      url || null, 
      slug, 
      is_active !== undefined ? is_active : true,
      is_default_tenant_admin_feature !== undefined ? is_default_tenant_admin_feature : false,
      sort_order || 0,
      icon || null,
      JSON.stringify(semantic_mapping || [])
    ]);

    // 2. Vincular aos módulos selecionados
    if (module_ids && Array.isArray(module_ids)) {
        const featureId = result.rows[0].id;
        for (const moduleId of module_ids) {
            await pool.query(
                'INSERT INTO system_feature_modules (feature_id, module_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [featureId, moduleId]
            );
        }
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating global feature:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  try {
    const denied = await requireApiPermission(request, 'master', 'ADMIN')
    if (denied) return denied
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();
    
    const { 
      name, 
      description, 
      category_id, 
      url, 
      slug, 
      is_active, 
      is_default_tenant_admin_feature,
      sort_order,
      module_ids,
      icon,
      semantic_mapping
    } = body;

    if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

    const query = `
      UPDATE system_features 
      SET name = $1, description = $2, category_id = $3, url = $4, slug = $5, 
          is_active = $6, is_default_tenant_admin_feature = $7, sort_order = $8, 
          icon = $9, semantic_mapping = $10
      WHERE id = $11
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      name, description, category_id, url, slug, 
      is_active, is_default_tenant_admin_feature, sort_order || 0, 
      icon || null, JSON.stringify(semantic_mapping || []), id
    ]);

    // Atualizar vínculos de módulos
    if (module_ids && Array.isArray(module_ids)) {
        // Remove antigos
        await pool.query('DELETE FROM system_feature_modules WHERE feature_id = $1', [id]);
        // Adiciona novos
        for (const moduleId of module_ids) {
            await pool.query(
                'INSERT INTO system_feature_modules (feature_id, module_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                [id, moduleId]
            );
        }
    }

    return NextResponse.json({ success: true, feature: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating global feature:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
    const token = request.cookies.get('admin_auth_token')?.value;
    const decoded = token ? await verifyToken(token) : null;
  
    if (!decoded || !decoded.is_system_role) {
      return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
    }
  
    try {
      const denied = await requireApiPermission(request, 'master', 'ADMIN')
      if (denied) return denied
      const { searchParams } = new URL(request.url);
      const id = searchParams.get('id');
      if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  
      await pool.query('DELETE FROM system_features WHERE id = $1', [id]);
      return NextResponse.json({ success: true });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
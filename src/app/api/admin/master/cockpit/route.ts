import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !(decoded as any).is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  try {
    const [segmentsRes, modulesRes, segmentModulesRes, categoriesRes, featuresRes, tagsRes, groupsRes] = await Promise.all([
      pool.query('SELECT id, name, slug FROM system_segments ORDER BY name ASC'),
      pool.query('SELECT id, name, slug, icon FROM system_modules ORDER BY name ASC'),
      pool.query('SELECT segment_id, module_id FROM system_segment_modules'),
      pool.query('SELECT id, name, icon, module_id, sort_order FROM system_categorias ORDER BY COALESCE(sort_order, 999) ASC, name ASC'),
      pool.query('SELECT id, name, slug, category_id, icon, sort_order, group_id, sort_order_in_group FROM system_features ORDER BY COALESCE(sort_order, 999) ASC, name ASC'),
      pool.query('SELECT * FROM system_role_tags ORDER BY display_name ASC'),
      pool.query(`SELECT sfg.id, sfg.name, sfg.icon, sfg.category_id, COALESCE(sfg.sort_order, 0) AS sort_order,
                         (SELECT COUNT(*) FROM system_features sf WHERE sf.group_id = sfg.id)::int AS tab_count
                  FROM system_feature_groups sfg
                  WHERE sfg.is_active = true
                  ORDER BY COALESCE(sfg.sort_order, 0) ASC, sfg.name ASC`)
    ]);

    return NextResponse.json({ 
      success: true, 
      segments: segmentsRes.rows,
      modules: modulesRes.rows,
      segmentModules: segmentModulesRes.rows,
      categories: categoriesRes.rows,
      features: featuresRes.rows,
      groups: groupsRes.rows,
      semanticTags: tagsRes.rows
    });
  } catch (error: any) {
    console.error('Error fetching cockpit data:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !(decoded as any).is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const body = await request.json();
  const { action, sourceId, targetId, isAssigned, tag, id: tagId } = body;

  const client = await pool.connect();
  try {
    const denied = await requireApiPermission(request, 'master', 'ADMIN')
    if (denied) return denied

    await client.query('BEGIN');

    if (action === 'TOGGLE_SEGMENT_MODULE') {
      if (isAssigned) {
        await client.query(
          'INSERT INTO system_segment_modules (segment_id, module_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [sourceId, targetId]
        );
      } else {
        await client.query(
          'DELETE FROM system_segment_modules WHERE segment_id = $1 AND module_id = $2',
          [sourceId, targetId]
        );
      }
    } 
    else if (action === 'TOGGLE_MODULE_CATEGORY') {
      if (isAssigned) {
        await client.query('UPDATE system_categorias SET module_id = $1 WHERE id = $2', [sourceId, targetId]);
      } else {
        await client.query('UPDATE system_categorias SET module_id = NULL WHERE id = $1', [targetId]);
      }
    }
    else if (action === 'TOGGLE_CATEGORY_FEATURE') {
      if (isAssigned) {
        await client.query('UPDATE system_features SET category_id = $1 WHERE id = $2', [sourceId, targetId]);
      } else {
        await client.query('UPDATE system_features SET category_id = NULL WHERE id = $1', [targetId]);
      }
    }
    else if (action === 'REORDER_CATEGORIES_BULK') {
      const { orderedIds } = body;
      if (Array.isArray(orderedIds)) {
        for (let i = 0; i < orderedIds.length; i++) {
          await client.query('UPDATE system_categorias SET sort_order = $1 WHERE id = $2', [i, orderedIds[i]]);
        }
      }
    }
    else if (action === 'REORDER_FEATURES_BULK') {
      const { orderedIds } = body;
      if (Array.isArray(orderedIds)) {
        for (let i = 0; i < orderedIds.length; i++) {
          await client.query('UPDATE system_features SET sort_order = $1 WHERE id = $2', [i, orderedIds[i]]);
        }
      }
    }
    else if (action === 'REORDER_ITEMS_BULK') {
      // Features soltas e grupos de abas dividem a mesma escala de sort_order na sidebar
      // (get_sidebar_menu_for_user), então são reordenados juntos numa lista única.
      const { orderedItems } = body;
      if (Array.isArray(orderedItems)) {
        for (let i = 0; i < orderedItems.length; i++) {
          const { kind, id } = orderedItems[i] || {};
          if (kind === 'group') {
            await client.query('UPDATE system_feature_groups SET sort_order = $1 WHERE id = $2', [i, id]);
          } else if (kind === 'feature') {
            await client.query('UPDATE system_features SET sort_order = $1 WHERE id = $2', [i, id]);
          }
        }
      }
    }
    else if (action === 'DELETE_TAG') {
      await client.query('DELETE FROM system_role_tags WHERE id = $1', [tagId || body.id]);
    }
    else if (action === 'CREATE_TAG') {
      await client.query(`
        INSERT INTO system_role_tags (tag_key, display_name, source_type, source_table, id_column, label_column, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [tag.tag_key, tag.display_name, tag.source_type, tag.source_table, tag.id_column, tag.label_column, tag.description]);
    }
    else if (action === 'UPDATE_TAG') {
      await client.query(`
        UPDATE system_role_tags 
        SET tag_key = $1, display_name = $2, source_type = $3, source_table = $4, id_column = $5, label_column = $6, description = $7
        WHERE id = $8
      `, [tag.tag_key, tag.display_name, tag.source_type, tag.source_table, tag.id_column, tag.label_column, tag.description, tagId]);
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error in Master Cockpit POST:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

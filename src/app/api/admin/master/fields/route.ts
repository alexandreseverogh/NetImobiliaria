import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const segment = searchParams.get('segment');
  const entityName = searchParams.get('entity');

  try {
    let query = `
      SELECT f.*, e.name as entity_name
      FROM system_metadata_fields f
      JOIN system_metadata_entities e ON f.entity_id = e.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (segment) {
      params.push(segment);
      query += ` AND f.segment = $${params.length}`;
    }

    if (entityName) {
      params.push(entityName);
      query += ` AND e.name = $${params.length}`;
    }

    query += ` ORDER BY f.sort_order ASC, f.created_at DESC`;

    const result = await pool.query(query, params);
    
    // Process rows to ensure options are always an array
    const fields = result.rows.map(row => ({
      ...row,
      options: Array.isArray(row.options) ? row.options : []
    }));

    return NextResponse.json({ fields });
  } catch (error: any) {
    console.error('Error fetching metadata fields:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const client = await pool.connect();

  try {
    const denied = await requireApiPermission(request, 'master', 'ADMIN')
    if (denied) return denied

    const body = await request.json();
    const {
      entity_name,
      segment, 
      field_name, 
      label, 
      field_type, 
      is_required = false, 
      options = [] 
    } = body;

    if (!entity_name || !segment || !field_name || !label) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await client.query('BEGIN');

    // 1. Get entity ID
    const entityResult = await client.query(
      'SELECT id FROM system_metadata_entities WHERE name = $1',
      [entity_name]
    );

    if (entityResult.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: `Entity '${entity_name}' not found` }, { status: 404 });
    }

    const entity_id = entityResult.rows[0].id;

    // 2. Insert into system_metadata_fields
    const fieldInsertResult = await client.query(
      `INSERT INTO system_metadata_fields 
       (entity_id, segment, field_name, label, field_type, is_required, options, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)
       RETURNING id`,
      [entity_id, segment, field_name, label, field_type, is_required, JSON.stringify(options)]
    );

    const fieldId = fieldInsertResult.rows[0].id;

    // 3. Insert into system_metadata_options if select type (for legacy support)
    if (field_type === 'select' && Array.isArray(options) && options.length > 0) {
      for (let i = 0; i < options.length; i++) {
        const opt = options[i];
        await client.query(
          `INSERT INTO system_metadata_options (field_id, option_label, option_value, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [fieldId, opt.label, opt.value, i + 1]
        );
      }
    }

    await client.query('COMMIT');

    return NextResponse.json({ 
      success: true, 
      message: 'Field created successfully',
      id: fieldId 
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating metadata field:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Missing field ID' }, { status: 400 });
  }

  const client = await pool.connect();

  try {
    const denied = await requireApiPermission(request, 'master', 'ADMIN')
    if (denied) return denied

    await client.query('BEGIN');

    // First delete options
    await client.query('DELETE FROM system_metadata_options WHERE field_id = $1', [id]);
    
    // Then delete the field
    const result = await client.query('DELETE FROM system_metadata_fields WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Field not found' }, { status: 404 });
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true, message: 'Field deleted successfully' });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error deleting metadata field:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
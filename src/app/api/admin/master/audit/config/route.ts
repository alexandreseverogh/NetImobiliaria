import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';
import { requireApiPermission } from '@/lib/auth/apiPermissions';

export const dynamic = 'force-dynamic';

/**
 * MASTER AUDIT GOVERNANCE API
 * 
 * Permite ao MASTER escanear o banco de dados e configurar o enriquecimento
 * de auditoria de forma dinâmica.
 */

export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || (!decoded.is_system_role && decoded.role_name !== 'Administrador')) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const client = await pool.connect();

  try {
    // 1. Escanear tabelas do banco
    const tablesRes = await client.query('SELECT * FROM get_available_database_tables()');
    
    // 2. Buscar configurações atuais
    const configsRes = await client.query(`
      SELECT ac.*, sm.name as module_name 
      FROM system_audit_configs ac
      LEFT JOIN system_modules sm ON ac.module_id = sm.id
    `);

    // 3. Buscar módulos para vinculação
    const modulesRes = await client.query('SELECT id, name, slug FROM system_modules WHERE is_active = true ORDER BY name');

    return NextResponse.json({
      success: true,
      availableTables: tablesRes.rows.map(r => r.table_name),
      currentConfigs: configsRes.rows,
      availableModules: modulesRes.rows
    });

  } catch (error: any) {
    console.error('Audit Config GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || (!decoded.is_system_role && decoded.role_name !== 'Administrador')) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const client = await pool.connect();

  try {
    const denied = await requireApiPermission(request, 'master', 'ADMIN')
    if (denied) return denied

    const body = await request.json();
    const { table_name, module_id, enrichment_type, premium_component_id, is_active } = body;

    if (!table_name) {
      return NextResponse.json({ error: 'Nome da tabela é obrigatório' }, { status: 400 });
    }

    const query = `
      INSERT INTO system_audit_configs 
        (table_name, module_id, enrichment_type, premium_component_id, is_active)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (table_name) 
      DO UPDATE SET 
        module_id = EXCLUDED.module_id,
        enrichment_type = EXCLUDED.enrichment_type,
        premium_component_id = EXCLUDED.premium_component_id,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
      RETURNING *
    `;

    const result = await client.query(query, [
      table_name, 
      module_id || null, 
      enrichment_type || 'UNIVERSAL', 
      premium_component_id || null,
      is_active !== undefined ? is_active : true
    ]);

    return NextResponse.json({
      success: true,
      config: result.rows[0]
    });

  } catch (error: any) {
    console.error('Audit Config POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

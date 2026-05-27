import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  const client = await pool.connect();
  try {
    // Buscar a empresa (tenant) do usuário logado
    const userId = decoded.userId;
    const tenantQuery = await client.query('SELECT tenant_id FROM user_tenant_membership WHERE user_id = $1 LIMIT 1', [userId]);
    let tenantId = tenantQuery.rows[0]?.tenant_id;

    if (!tenantId && decoded.is_system_role) {
       // Master Admin: busca o tenant que MAIS RECENTEMENTE configurou ESTA skill específica
       const lastMapping = await client.query(`
         SELECT tfo.tenant_id 
         FROM tenant_feature_overrides tfo
         JOIN system_features f ON f.slug = $1
         WHERE tfo.feature_id = f.id
         ORDER BY tfo.created_at DESC LIMIT 1
       `, [slug]);
       tenantId = lastMapping.rows[0]?.tenant_id;
    }

    if (!tenantId) {
      return NextResponse.json({ error: 'Nenhuma empresa encontrada para este usuário' }, { status: 404 });
    }

    // Buscar as configurações de Skill para este tenant
    const res = await client.query(`
      SELECT f.id, f.name, f.skill_metadata, tfo.skill_config
      FROM system_features f
      JOIN tenant_feature_overrides tfo ON tfo.tenant_id = $1 AND tfo.feature_id = f.id
      WHERE f.slug = $2
    `, [tenantId, slug]);

    if (res.rows.length === 0) {
      return NextResponse.json({ mappings: {}, requirements: [] });
    }

    const config = res.rows[0].skill_config || {};
    
    // Simplificar os mapeamentos para a UI
    return NextResponse.json({
      name: res.rows[0].name,
      requirements: res.rows[0].skill_metadata?.requirements || [],
      mappings: config.mappings || {},
      custom_mappings: config.custom_mappings || []
    });

  } catch (err: any) {
     return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    client.release();
  }
}

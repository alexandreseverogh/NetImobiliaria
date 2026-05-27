import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;
  
  // Apenas Master Admin ou usuário 'admin'
  const isMaster = decoded?.is_system_role || decoded?.username === 'admin';
  if (!isMaster) {
    return NextResponse.json({ error: 'Acesso Restrito' }, { status: 403 });
  }

  const client = await pool.connect();
  try {
    // 1. Matriz de Segmentos (Segmentos <-> Módulos)
    const segmentsRes = await client.query(`
      SELECT 
        s.id, s.name, s.slug, s.description,
        json_agg(json_build_object('id', m.id, 'name', m.name)) FILTER (WHERE m.id IS NOT NULL) as modules
      FROM system_segments s
      LEFT JOIN system_segment_modules sm ON s.id = sm.segment_id
      LEFT JOIN system_modules m ON sm.module_id = m.id
      GROUP BY s.id
      ORDER BY s.name
    `);

    // 2. Matriz de Módulos (Módulos <-> Funcionalidades)
    const modulesRes = await client.query(`
      SELECT 
        m.id, m.name, m.description,
        json_agg(json_build_object(
          'id', f.id, 
          'name', f.name, 
          'slug', f.slug, 
          'is_skill', f.is_skill
        )) FILTER (WHERE f.id IS NOT NULL) as features
      FROM system_modules m
      LEFT JOIN system_feature_modules fm ON m.id = fm.module_id
      LEFT JOIN system_features f ON fm.feature_id = f.id
      GROUP BY m.id
      ORDER BY m.name
    `);

    // 3. Inventário Global (Todas as Funcionalidades Únicas)
    const featuresRes = await client.query(`
      SELECT 
        f.id, f.name, f.slug, f.description, f.is_active, f.is_skill, f.skill_metadata,
        f.category_id
      FROM system_features f
      ORDER BY f.name
    `);

    return NextResponse.json({
      success: true,
      segments: segmentsRes.rows,
      modules: modulesRes.rows,
      allFeatures: featuresRes.rows
    });

  } catch (error: any) {
    console.error('Erro na Governança:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}

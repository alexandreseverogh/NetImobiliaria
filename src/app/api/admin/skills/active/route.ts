import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/database/connection';
import { verifyTokenNode } from '@/lib/auth/jwt-node';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // 1. Validar autenticação
    const cookie = request.cookies.get('admin_auth_token');
    if (!cookie?.value) {
      return NextResponse.json({ success: false, message: 'Não autorizado' }, { status: 401 });
    }

    const payload = verifyTokenNode(cookie.value);
    if (!payload?.tenantId) {
      return NextResponse.json({ success: false, message: 'Tenant não identificado' }, { status: 401 });
    }

    const tenantId = payload.tenantId;

    // 2. Buscar Skills Ativas para este Tenant
    // Buscamos o cruzamento entre as features do tenant e o manifesto de skills
    const query = `
      SELECT 
        f.id as feature_id,
        f.slug,
        m.name as skill_name,
        m.skill_icon,
        m.component_path,
        m.is_premium,
        o.skill_config
      FROM public.system_features f
      JOIN public.system_skill_manifest m ON f.id = m.feature_id
      JOIN public.tenant_feature_overrides o ON f.id = o.feature_id
      WHERE o.tenant_id = $1 
        AND o.is_active = true 
        AND f.is_skill = true
    `;

    const result = await pool.query(query, [tenantId]);

    return NextResponse.json({
      success: true,
      skills: result.rows,
      count: result.rows.length
    });

  } catch (error) {
    console.error('[SKILLS_API] Erro ao buscar skills:', error);
    return NextResponse.json({ success: false, message: 'Erro interno' }, { status: 500 });
  }
}

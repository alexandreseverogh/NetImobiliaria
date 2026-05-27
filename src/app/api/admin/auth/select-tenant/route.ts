import { NextRequest, NextResponse } from 'next/server';
import jwt, { SignOptions } from 'jsonwebtoken';
import { AUTH_CONFIG } from '@/lib/config/auth';
import pool from '@/lib/database/connection';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, tenantId } = body;

    if (!userId || !tenantId) {
      return NextResponse.json({ success: false, error: 'Usuário e Empresa são obrigatórios' }, { status: 400 });
    }

    // 1. Validar vínculo e buscar dados para o JWT
    const membershipQuery = `
      SELECT utm.*, ur.name as role_name, ur.level as role_level, 
             t.name as tenant_name, t.slug as tenant_slug, t.segment as tenant_segment,
             u.username, u.email, u.nome
      FROM user_tenant_membership utm
      JOIN user_roles ur ON utm.role_id = ur.id
      JOIN tenants t ON utm.tenant_id = t.id
      JOIN users u ON utm.user_id = u.id
      WHERE utm.user_id = $1 AND utm.tenant_id = $2 AND utm.is_active = true
    `;
    const result = await pool.query(membershipQuery, [userId, tenantId]);
    const membership = result.rows[0];

    if (!membership) {
      return NextResponse.json({ success: false, error: 'Vínculo inválido ou inativo' }, { status: 403 });
    }

    // 2. Gerar JWT (Igual à rota de login para manter paridade com o Middleware)
    const jwtSecret = AUTH_CONFIG.JWT.SECRET;
    const jwtPayload = {
      userId: membership.user_id,
      username: membership.username,
      email: membership.email,
      role_name: membership.role_name,
      role_level: membership.role_level,
      tenantId: membership.tenant_id,
      tenantSlug: membership.tenant_slug,
      permissoes: {} // No Pilar 3 buscaremos as permissões reais por Tenant
    };

    const token = jwt.sign(jwtPayload, jwtSecret, {
      expiresIn: AUTH_CONFIG.JWT.ACCESS_TOKEN_EXPIRES_IN || '24h'
    } as SignOptions);

    // 3. Atualizar estatísticas
    await pool.query('UPDATE user_tenant_membership SET last_access = NOW() WHERE user_id = $1 AND tenant_id = $2', [userId, tenantId]);

    // 4. Retornar resposta e SETAR COOKIE HTTP-ONLY
    const response = NextResponse.json({
      success: true,
      user: {
        id: membership.user_id,
        username: membership.username,
        email: membership.email,
        nome: membership.nome,
        role_name: membership.role_name,
        role_level: membership.role_level,
        currentTenant: {
          id: membership.tenant_id,
          name: membership.tenant_name,
          slug: membership.tenant_slug,
          segment: membership.tenant_segment
        }
      },
      sessionId: token // Usamos o token como session ID no front
    });

    response.cookies.set('admin_auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/'
    });

    return response;
  } catch (error) {
    console.error('Erro na seleção de tenant:', error);
    return NextResponse.json({ success: false, error: 'Erro interno ao processar seleção' }, { status: 500 });
  }
}

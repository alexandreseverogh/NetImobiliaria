import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import pool from '@/lib/database/connection';
import bcrypt from 'bcryptjs';

export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;

  if (!decoded || !decoded.is_system_role) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  try {
    const query = `
      SELECT t.*,
             s.name as segment_name, 
             s.color_theme as segment_color, 
             s.icon as segment_icon,
             u.nome as admin_nome, 
             u.email as admin_email, 
             u.username as admin_username,
             (
               SELECT json_agg(sm.name)
               FROM tenant_modules tm
               JOIN system_modules sm ON tm.module_id = sm.id
               WHERE tm.tenant_id = t.id AND tm.is_enabled = true
             ) as active_modules,
             (SELECT COUNT(*) FROM user_tenant_membership WHERE tenant_id = t.id) as total_users
      FROM tenants t
      LEFT JOIN system_segments s ON t.segment_id = s.id
      LEFT JOIN user_tenant_membership utm ON t.id = utm.tenant_id AND utm.is_owner = true
      LEFT JOIN users u ON utm.user_id = u.id
      ORDER BY t.created_at DESC
    `;
    
    const result = await pool.query(query);
    
    const globalUsersQuery = `SELECT COUNT(DISTINCT user_id) as total FROM user_tenant_membership`;
    const globalUsersResult = await pool.query(globalUsersQuery);

    return NextResponse.json({ 
      tenants: result.rows,
      totalGlobalUsers: parseInt(globalUsersResult.rows[0].total || '0')
    });
  } catch (error: any) {
    console.error('Error fetching tenants:', error);
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
      name, slug, segment_id, logo, logo_mime_type, cnpj_cpf,
      logradouro, numero, bairro, cidade, estado, cep, telefone, email_contato,
      admin_nome, admin_username, admin_email, admin_password,
      selected_modules, ai_config, primary_color, secondary_color,
      calendario, google_email, duracao_visita,
      anthropic_api_key, slack_webhook_url, evolution_api_url, evolution_api_key, evolution_instance, agent_confidence_threshold
    } = body;

    await client.query('BEGIN');

    // 1. Inserir Tenant
    const tenantResult = await client.query(`
      INSERT INTO tenants (
        name, slug, segment_id, logo_url, cnpj_cpf, 
        logradouro, numero, bairro, cidade, estado, cep, telefone, email_contato, status, ai_config,
        primary_color, secondary_color, calendario, google_email, duracao_visita,
        anthropic_api_key, slack_webhook_url, evolution_api_url, evolution_api_key, evolution_instance, agent_confidence_threshold
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'active', $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      RETURNING id
    `, [
      name, slug, segment_id, logo || null, cnpj_cpf || null,
      logradouro || null, numero || null, bairro || null, cidade || null, 
      estado || null, cep || null, telefone || null, email_contato || null,
      JSON.stringify(ai_config || {}),
      primary_color || '#1A2B3C',
      secondary_color || '#F1F1F1',
      calendario || false,
      google_email || null,
      duracao_visita || 60,
      anthropic_api_key || null,
      slack_webhook_url || null,
      evolution_api_url || null,
      evolution_api_key || null,
      evolution_instance || null,
      agent_confidence_threshold !== undefined && agent_confidence_threshold !== null ? parseFloat(agent_confidence_threshold) : 0.85
    ]);
    const tenantId = tenantResult.rows[0].id;

    // 2. Tratar Usuário Admin
    let userId;
    const userCheck = await client.query('SELECT id FROM users WHERE email = $1 OR username = $2', [admin_email, admin_username]);
    
    if (userCheck.rows.length > 0) {
      userId = userCheck.rows[0].id;
      // 🚀 MASTER FIX: Mesmo se o usuário existir, vamos atualizar a senha dele para a que foi digitada no provisionamento
      if (admin_password) {
        const hashedPassword = await bcrypt.hash(admin_password, 10);
        await client.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, userId]);
      }
    } else {
      if (!admin_password) {
        throw new Error('Senha é obrigatória para novos usuários');
      }
      const hashedPassword = await bcrypt.hash(admin_password, 10);
      const userResult = await client.query(`
        INSERT INTO users (nome, email, username, password, ativo)
        VALUES ($1, $2, $3, $4, true)
        RETURNING id
      `, [admin_nome, admin_email, admin_username, hashedPassword]);
      userId = userResult.rows[0].id;
    }

    // 3. Criar Perfil de Administrador para este Tenant
    const roleResult = await client.query(`
      INSERT INTO user_roles (name, description, level, is_system_role, tenant_id)
      VALUES ('Administrador', 'Acesso total administrativo à unidade', 100, false, $1)
      RETURNING id
    `, [tenantId]);
    const roleId = roleResult.rows[0].id;

    // 4. Vincular Usuário ao Tenant
    await client.query(`
      INSERT INTO user_tenant_membership (user_id, tenant_id, role_id, is_owner, is_active)
      VALUES ($1, $2, $3, true, true)
    `, [userId, tenantId, roleId]);

    // 5. Ativar Módulos e Auto-provisionar Permissões
    if (selected_modules && Array.isArray(selected_modules)) {
      for (const moduleId of selected_modules) {
        await client.query(`
          INSERT INTO tenant_modules (tenant_id, module_id, is_enabled)
          VALUES ($1, $2, true)
        `, [tenantId, moduleId]);

        // Auto-provisionar permissões do módulo para o role Administrador
        await client.query(`
          INSERT INTO role_permissions (role_id, permission_id, granted_by, granted_at)
          SELECT $1, p.id, NULL, NOW()
          FROM system_feature_modules sfm
          JOIN system_features sf ON sfm.feature_id = sf.id
          JOIN permissions p ON p.feature_id = sf.id
          WHERE sfm.module_id = $2 AND sf.is_active = true
          ON CONFLICT DO NOTHING
        `, [roleId, moduleId]);
      }
    }

    // Auto-provisionar features padrão de administrador de tenant
    await client.query(`
      INSERT INTO role_permissions (role_id, permission_id, granted_by, granted_at)
      SELECT $1, p.id, NULL, NOW()
      FROM system_features sf
      JOIN permissions p ON p.feature_id = sf.id
      WHERE sf.is_default_tenant_admin_feature = true AND sf.is_active = true
      ON CONFLICT DO NOTHING
    `, [roleId]);

    // 6. Sincronizar Soberania (Tenant Feature Overrides) para os módulos selecionados
    if (selected_modules && Array.isArray(selected_modules)) {
      await client.query(`
        INSERT INTO tenant_feature_overrides (tenant_id, feature_id, is_active)
        SELECT $1, sfm.feature_id, true
        FROM system_feature_modules sfm
        JOIN system_features sf ON sfm.feature_id = sf.id
        WHERE sfm.module_id = ANY($2::uuid[]) AND sf.is_active = true
        ON CONFLICT (tenant_id, feature_id) DO UPDATE SET is_active = true
      `, [tenantId, selected_modules]);
    }

    // 7. Garantir Soberania para features padrão (Essential Features)
    await client.query(`
      INSERT INTO tenant_feature_overrides (tenant_id, feature_id, is_active)
      SELECT $1, sf.id, true
      FROM system_features sf
      WHERE sf.is_default_tenant_admin_feature = true AND sf.is_active = true
      ON CONFLICT (tenant_id, feature_id) DO UPDATE SET is_active = true
    `, [tenantId]);

    await client.query('COMMIT');
    return NextResponse.json({ success: true, tenantId });

  } catch (error: any) {
    if (client) await client.query('ROLLBACK');
    console.error('Error creating tenant:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
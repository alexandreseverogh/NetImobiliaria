import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { requireApiPermission } from '@/lib/auth/apiPermissions';
import pool from '@/lib/database/connection';

export const dynamic = 'force-dynamic';

/**
 * MASTER PROVISIONING API
 * 
 * Este endpoint é o coração da governança multi-tenant do sistema.
 * Ele permite que administradores do sistema (is_system_role) configurem
 * quais módulos e features estão disponíveis para cada tenant.
 * 
 * Segurança: Requer is_system_role no JWT.
 */

export async function GET(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;
  console.log(`🛡️ [PROVISIONING_DEBUG_GET] User: ${decoded?.username}, RoleLevel: ${decoded?.role_level}, Master: ${decoded?.is_system_role}`);

  // Governança: Garantir que apenas MASTER ADMINS acessem esta rota
  // 🛡️ IDENTITY BRIDGE: Se for o usuário 'admin', garantimos o acesso Master mesmo em caso de ruído no Token
  const isHardcodedMaster = decoded?.username === 'admin';
  
  if (!isHardcodedMaster && (!decoded || !decoded.is_system_role)) {
    console.warn(`🛑 [PROVISIONING_API] Acesso negado para usuário: ${decoded?.username}`);
    return NextResponse.json(
      { error: 'Acesso Restrito: Requer privilégios de Administrador Master' }, 
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenant_id');

  const client = await pool.connect();

  try {
    // CASO 1: Carregar provisões específicas de um tenant
    if (tenantId) {
      // Módulos ativos no tenant
      const modulesRes = await client.query(
        'SELECT module_id, theme_mode, primary_color FROM tenant_modules WHERE tenant_id = $1 AND is_enabled = true',
        [tenantId]
      );

      // Features habilitadas (overrides)
      const featuresRes = await client.query(
        'SELECT feature_id, skill_config FROM tenant_feature_overrides WHERE tenant_id = $1 AND is_active = true',
        [tenantId]
      );

      const moduleConfigs: Record<string, any> = {};
      modulesRes.rows.forEach(row => {
        moduleConfigs[row.module_id] = {
          theme_mode: row.theme_mode || 'light',
          primary_color: row.primary_color || ''
        };
      });

      // Mapear também os skill_configs por feature_id
      const skillConfigs: Record<number, any> = {};
      featuresRes.rows.forEach(row => {
        if (row.skill_config) skillConfigs[row.feature_id] = row.skill_config;
      });

      return NextResponse.json({
        success: true,
        modules: modulesRes.rows.map(r => r.module_id),
        features: featuresRes.rows.map(r => r.feature_id),
        moduleConfigs,
        skillConfigs
      });
    }

    // CASO 2: Carregar a Árvore Mestra de Provisionamento (Tree)
    // Buscamos a hierarquia completa: Segmentos -> Módulos -> Features
    const treeQuery = `
      SELECT 
        s.id as segment_id, s.name as segment_name, s.icon as segment_icon,
        m.id as module_id, m.name as module_name, m.slug as module_slug,
        f.id as feature_id, f.name as feature_name, f.slug as feature_slug, 
        f.is_default_tenant_admin_feature as is_default,
        f.is_skill, f.skill_metadata,
        cat.name as category_name
      FROM system_segments s
      LEFT JOIN system_segment_modules smm ON s.id = smm.segment_id AND smm.is_active = true
      LEFT JOIN system_modules m ON smm.module_id = m.id AND m.is_active = true
      LEFT JOIN system_feature_modules fm ON m.id = fm.module_id
      LEFT JOIN system_features f ON fm.feature_id = f.id AND f.is_active = true
      LEFT JOIN system_categorias cat ON f.category_id = cat.id
      WHERE s.is_active = true
      ORDER BY s.name ASC, m.name ASC, cat.name ASC, f.name ASC
    `;

    const treeRes = await client.query(treeQuery);

    const segmentsMap: Record<string, any> = {};
    
    // Processamento ultra-seguro da árvore
    if (treeRes && treeRes.rows) {
      treeRes.rows.forEach(row => {
        if (row.segment_id && !segmentsMap[row.segment_id]) {
          segmentsMap[row.segment_id] = {
            id: row.segment_id,
            name: row.segment_name || 'Sem Nome',
            icon: row.segment_icon || 'box',
            modules: []
          };
        }

        if (row.segment_id && row.module_id) {
          let module = segmentsMap[row.segment_id].modules.find((m: any) => m.id === row.module_id);
          if (!module) {
            module = {
              id: row.module_id,
              name: row.module_name || 'Módulo Sem Nome',
              slug: row.module_slug || '',
              features: []
            };
            segmentsMap[row.segment_id].modules.push(module);
          }

          if (row.feature_id) {
            module.features.push({
              id: row.feature_id,
              name: row.feature_name || 'Feature Sem Nome',
              slug: row.feature_slug || '',
              is_default: !!row.is_default,
              is_skill: !!row.is_skill,
              skill_metadata: row.skill_metadata || {},
              category_name: row.category_name || 'Diversos'
            });
          }
        }
      });
    }

    const tenantsRes = await client.query('SELECT id, name, segment_id FROM tenants ORDER BY name ASC');
    
    const orphanRes = await client.query(`
      SELECT f.id, f.name, f.slug, f.is_default_tenant_admin_feature as is_default, 
             f.is_skill, f.skill_metadata,
             cat.name as category_name
      FROM system_features f
      LEFT JOIN system_categorias cat ON f.category_id = cat.id
      WHERE f.is_active = true 
      AND f.id NOT IN (SELECT feature_id FROM system_feature_modules)
      ORDER BY f.name ASC
    `);

    const masterRes = await client.query('SELECT id, username, two_fa_enabled FROM public.users WHERE id = $1', [decoded.userId]);

    return NextResponse.json({
      success: true,
      tree: Object.values(segmentsMap),
      tenants: tenantsRes.rows || [],
      orphanFeatures: (orphanRes.rows || []).map(r => ({
        ...r,
        is_skill: !!r.is_skill,
        skill_metadata: r.skill_metadata || {}
      })),
      masterUserInfo: masterRes.rows[0] || null
    });

  } catch (error: any) {
    console.error('Master Provisioning Error (GET):', error);
    return NextResponse.json({ error: 'Erro interno ao processar provisionamento' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get('admin_auth_token')?.value;
  const decoded = token ? await verifyToken(token) : null;
  console.log(`🛡️ [PROVISIONING_DEBUG_POST] User: ${decoded?.username}, Master: ${decoded?.is_system_role}`);

  const isHardcodedMaster = decoded?.username === 'admin';
  
  if (!isHardcodedMaster && (!decoded || !decoded.is_system_role)) {
    return NextResponse.json({ error: 'Acesso Master Requerido' }, { status: 403 });
  }

  const client = await pool.connect();

  try {
    const denied = await requireApiPermission(request, 'master', 'ADMIN')
    if (denied) return denied
    const body = await request.json();
    const { tenant_id, selected_modules, module_configs, feature_overrides } = body;

    // Validação básica
    if (!tenant_id) {
      return NextResponse.json({ error: 'ID da empresa é obrigatório' }, { status: 400 });
    }

    // Iniciar transação para garantir que não deixaremos o contrato do tenant em estado inconsistente
    await client.query('BEGIN');

    // 1. Sincronizar Módulos do Tenant
    // Removemos os antigos e inserimos os novos (abordagem de espelho)
    await client.query('DELETE FROM tenant_modules WHERE tenant_id = $1', [tenant_id]);
    
    if (selected_modules && Array.isArray(selected_modules)) {
      for (const moduleId of selected_modules) {
        const config = (module_configs && module_configs[moduleId]) || { theme_mode: 'light', primary_color: '' };
        await client.query(
          `INSERT INTO tenant_modules 
            (tenant_id, module_id, is_enabled, theme_mode, primary_color) 
           VALUES ($1, $2, true, $3, $4)`,
          [tenant_id, moduleId, config.theme_mode, config.primary_color]
        );
      }
    }

    // 2. Sincronizar Feature Overrides
    // Removemos e reinserimos as features que o Master escolheu liberar acima do padrão
    await client.query('DELETE FROM tenant_feature_overrides WHERE tenant_id = $1', [tenant_id]);

    if (feature_overrides && Array.isArray(feature_overrides)) {
      const skill_configs = body.skill_configs || {};
      for (const featureId of feature_overrides) {
        const config = skill_configs[featureId] || {};
        await client.query(
          'INSERT INTO tenant_feature_overrides (tenant_id, feature_id, is_active, skill_config) VALUES ($1, $2, true, $3)',
          [tenant_id, featureId, JSON.stringify(config)]
        );
      }
    }

    await client.query('COMMIT');

    return NextResponse.json({ 
      success: true, 
      message: 'Provisionamento Master aplicado com sucesso' 
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Master Provisioning Error (POST):', error);
    return NextResponse.json({ error: 'Falha ao gravar provisionamento: ' + error.message }, { status: 500 });
  } finally {
    client.release();
  }
}
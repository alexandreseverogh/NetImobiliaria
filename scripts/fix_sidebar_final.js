import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 15432,
  user: 'postgres',
  password: 'postgres',
  database: 'net_imobiliaria'
});

async function run() {
  try {
    console.log('🔄 Fortalecendo detecção de Super Admin na Sidebar...');

    await pool.query(`
      CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(
          p_user_id UUID, 
          p_system_id TEXT, 
          p_tenant_id UUID
      )
      RETURNS JSONB AS $$
      DECLARE
          _v_is_superadm  BOOLEAN := false;
          _v_segment_id   UUID;
          _v_menu_output  JSONB;
      BEGIN
          -- DETERMINAÇÃO DE SUPER ADMIN (Mais robusta)
          -- 1. Verifica no contexto do Tenant atual
          IF p_tenant_id IS NOT NULL THEN
              SELECT EXISTS (
                  SELECT 1 
                  FROM public.user_tenant_membership utm
                  JOIN public.user_roles ur ON utm.role_id = ur.id
                  WHERE utm.user_id = p_user_id
                    AND utm.tenant_id = p_tenant_id
                    AND (ur.is_system_role = true OR ur.name ILIKE '%Super Admin%')
                    AND utm.is_active = true
              ) INTO _v_is_superadm;
          END IF;

          -- 2. Se não encontrou, verifica Global/Master
          IF NOT _v_is_superadm THEN
              SELECT EXISTS (
                  SELECT 1 
                  FROM public.user_role_assignments ura
                  JOIN public.user_roles ur ON ura.role_id = ur.id
                  WHERE ura.user_id = p_user_id
                    AND (ur.is_system_role = true OR ur.name ILIKE '%Super Admin%')
              ) INTO _v_is_superadm;
          END IF;

          -- 3. Segmento da empresa
          SELECT segment_id INTO _v_segment_id
          FROM public.tenants WHERE id = p_tenant_id;

          -- 4. Seleção de Itens
          SELECT jsonb_agg(item_row)
          INTO _v_menu_output
          FROM (
              SELECT jsonb_build_object(
                  'id',          s.id,
                  'parent_id',   s.parent_id,
                  'name',        s.name,
                  'path',        s.url,     
                  'icon',        s.icon_name,
                  'order_index', s.order_index,
                  'system_id',   s.system_id,
                  'is_active',   s.is_active,
                  'permission_required', s.permission_required
              ) AS item_row
              FROM public.sidebar_menu_items s
              WHERE s.is_active = true
                AND (
                  s.system_id = p_system_id 
                  OR (s.system_id IS NULL AND p_system_id = 'admin')
                  OR p_system_id = 'master' -- Se p_system_id for master, traz tudo
                )
                AND (
                  _v_is_superadm = true
                  OR s.permission_required IS NULL
                  OR EXISTS (
                      SELECT 1 FROM public.tenant_feature_overrides o
                      JOIN public.system_features f ON o.feature_id = f.id
                      WHERE o.tenant_id = p_tenant_id 
                        AND f.slug = s.permission_required 
                        AND o.is_active = true
                  )
                  OR (
                      NOT EXISTS (
                          SELECT 1 FROM public.tenant_feature_overrides o
                          JOIN public.system_features f ON o.feature_id = f.id
                          WHERE o.tenant_id = p_tenant_id AND f.slug = s.permission_required
                      )
                      AND EXISTS (
                          SELECT 1 FROM public.system_segment_blueprints b
                          JOIN public.system_features f ON b.feature_id = f.id
                          WHERE b.segment_id = _v_segment_id 
                            AND f.slug = s.permission_required 
                            AND b.is_required = true
                      )
                  )
                )
              ORDER BY s.parent_id NULLS FIRST, s.order_index ASC
          ) items_flat;

          RETURN COALESCE(_v_menu_output, '[]'::jsonb);
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Sincronizar system_id das features críticas
    await pool.query(`
      UPDATE sidebar_menu_items 
      SET system_id = 'admin' 
      WHERE system_id IS NULL AND (parent_id = 2 OR id = 2);
    `);

    console.log('✅ Sidebar SQL function atualizada para Super Admin bypass total.');
    
  } catch(e) {
    console.error('❌ Erro:', e);
  } finally {
    pool.end();
  }
}

run();

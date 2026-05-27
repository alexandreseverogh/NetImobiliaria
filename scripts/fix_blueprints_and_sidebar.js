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
    console.log('🔄 Corrigindo Blueprints de Segmentos e Sidebars...');

    // 1. Corrigir a função da sidebar
    await pool.query(`
      CREATE OR REPLACE FUNCTION public.get_sidebar_menu_for_user(
          p_user_id UUID, 
          p_system_id TEXT, 
          p_tenant_id UUID
      )
      RETURNS JSONB AS $$
      DECLARE
          _v_is_superadm  BOOLEAN;
          _v_segment_id   UUID;
          _v_menu_output  JSONB;
      BEGIN
          -- Verifica se o usuário é super admin no tenant ou em assignment master
          SELECT EXISTS (
              SELECT 1 
              FROM public.user_tenant_membership utm
              JOIN public.user_roles ur ON utm.role_id = ur.id
              WHERE utm.user_id = p_user_id
                AND (utm.tenant_id = p_tenant_id OR p_tenant_id IS NULL)
                AND ur.is_system_role = true
                AND ur.name = 'Super Admin'
                AND utm.is_active = true
          ) INTO _v_is_superadm;

          IF NOT _v_is_superadm THEN
              SELECT EXISTS (
                  SELECT 1 
                  FROM public.user_role_assignments ura
                  JOIN public.user_roles ur ON ura.role_id = ur.id
                  WHERE ura.user_id = p_user_id
                    AND ur.is_system_role = true
                    AND ur.name = 'Super Admin'
              ) INTO _v_is_superadm;
          END IF;

          -- [3] Segmento da empresa
          SELECT segment_id INTO _v_segment_id
          FROM public.tenants WHERE id = p_tenant_id;

          -- [4] Seleção de Itens (Projeção Limpa para o Frontend)
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
    console.log('✅ Função get_sidebar_menu_for_user atualizada (sem hardcoding).');

    // 2. Garantir que as features (Perfis/Usuários) estejam nos Blueprints!
    // Para todos os segmentos, mapear essas features.
    console.log('🔄 Vinculando Perfis, Usuários e Master Configs a todos os Segmentos...');
    await pool.query(`
      INSERT INTO system_segment_blueprints (segment_id, feature_id, is_required)
      SELECT s.id, f.id, true
      FROM system_segments s
      CROSS JOIN system_features f
      WHERE f.slug IN ('perfis', 'usuarios', 'system_features', 'settings')
      AND NOT EXISTS (
        SELECT 1 FROM system_segment_blueprints b
        WHERE b.segment_id = s.id AND b.feature_id = f.id
      );
    `);

    console.log('✅ Blueprints atualizados com sucesso.');
    
  } catch(e) {
    console.error('❌ Erro:', e);
  } finally {
    await pool.end();
  }
}

run();

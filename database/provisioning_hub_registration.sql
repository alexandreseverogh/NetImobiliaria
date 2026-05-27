-- Registro da Funcionalidade Master
INSERT INTO system_features (name, slug, description, is_active, is_default_tenant_admin_feature) 
VALUES ('Hub de Provisionamento Master', 'master-provisioning-hub', 'Interface unificada para provimento de segmentos, modulos e empresas', true, false) 
ON CONFLICT (slug) DO NOTHING;

-- Registro do Menu Master (Primeira posição do grupo 83)
INSERT INTO sidebar_menu_items (name, url, icon_name, parent_id, order_index, system_id, permission_required, is_active) 
VALUES ('Provisionamento Master', '/admin/master/provisioning', 'CommandLineIcon', 83, 0, 'admin', 'master-provisioning-hub', true);

-- Registro da funcionalidade IA da Plataforma (Master)
INSERT INTO system_features (name, slug, description, is_active, is_default_tenant_admin_feature)
VALUES (
  'IA da Plataforma',
  'master-ia-plataforma',
  'Configuração global do modelo de LLM para todos os insights de campanhas',
  true,
  false
)
ON CONFLICT (slug) DO NOTHING;

-- Registro do item de menu no grupo Master (parent_id = 83)
-- order_index 5 para aparecer após os itens existentes
INSERT INTO sidebar_menu_items (name, url, icon_name, parent_id, order_index, system_id, permission_required, is_active)
VALUES (
  'IA da Plataforma',
  '/admin/master/ia-plataforma',
  'CpuChipIcon',
  83,
  5,
  'admin',
  'master-ia-plataforma',
  true
)
ON CONFLICT DO NOTHING;

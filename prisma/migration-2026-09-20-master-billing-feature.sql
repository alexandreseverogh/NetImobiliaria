-- Registra a tela "Gestão de Cobrança" (Master) na sidebar — lista tenants ×
-- módulo × billing_status e permite override manual (força reativação, ou
-- marca inadimplente manualmente pra cobrança ainda fora da Stripe).
--
-- Master-only por design — segue exatamente o mesmo padrão já usado por
-- outras páginas exclusivas do Master (ex.: id=91 "Cockpit do Produto"):
-- zero linha em permissions/role_permissions/tenant_feature_overrides.
-- get_sidebar_menu_for_user() já bypassa Filtro A e B pra v_is_master=true;
-- só o Filtro C (url real) precisa estar satisfeito, o que esta migração
-- já garante.

INSERT INTO public.system_features (name, slug, url, category_id, sort_order, icon, is_active)
VALUES ('Gestão de Cobrança', 'master-billing', '/admin/master/billing', 22, 100, 'lucide-Banknote', true)
ON CONFLICT (slug) DO NOTHING;

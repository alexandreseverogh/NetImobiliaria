-- ============================================================
-- MIGRATION 208: Função de Provisionamento de Novo Tenant
-- Net Imobiliária — Suporte Multi-Tenant
-- ============================================================
-- Esta função é chamada ao criar um novo tenant.
-- Ela copia todos os catálogos padrão do tenant base
-- (00000000-0000-0000-0000-000000000001) para o novo tenant.

CREATE OR REPLACE FUNCTION public.provision_tenant_catalogs(p_new_tenant_id UUID)
RETURNS VOID AS $$
DECLARE
  v_base_tenant UUID := '00000000-0000-0000-0000-000000000001';
BEGIN

  -- 1. tipos_imovel
  INSERT INTO public.tipos_imovel (nome, descricao, ativo, tenant_id)
  SELECT nome, descricao, ativo, p_new_tenant_id
  FROM public.tipos_imovel
  WHERE tenant_id = v_base_tenant
  ON CONFLICT DO NOTHING;

  -- 2. finalidades_imovel
  INSERT INTO public.finalidades_imovel (nome, descricao, ativo, tipo_destaque, tenant_id)
  SELECT nome, descricao, ativo, tipo_destaque, p_new_tenant_id
  FROM public.finalidades_imovel
  WHERE tenant_id = v_base_tenant
  ON CONFLICT DO NOTHING;

  -- 3. status_imovel
  INSERT INTO public.status_imovel (nome, descricao, cor, ativo, tenant_id)
  SELECT nome, descricao, cor, ativo, p_new_tenant_id
  FROM public.status_imovel
  WHERE tenant_id = v_base_tenant
  ON CONFLICT DO NOTHING;

  -- 4. tipo_documento_imovel
  INSERT INTO public.tipo_documento_imovel (descricao, ativo, tenant_id)
  SELECT descricao, ativo, p_new_tenant_id
  FROM public.tipo_documento_imovel
  WHERE tenant_id = v_base_tenant
  ON CONFLICT DO NOTHING;

  -- 5. financiadores
  INSERT INTO public.financiadores (nome, sigla, ativo, tenant_id)
  SELECT nome, sigla, ativo, p_new_tenant_id
  FROM public.financiadores
  WHERE tenant_id = v_base_tenant
  ON CONFLICT DO NOTHING;

  -- 6. categorias_amenidades
  INSERT INTO public.categorias_amenidades (nome, descricao, icone, cor, ordem, ativo, tenant_id)
  SELECT nome, descricao, icone, cor, ordem, ativo, p_new_tenant_id
  FROM public.categorias_amenidades
  WHERE tenant_id = v_base_tenant
  ON CONFLICT DO NOTHING;

  -- 7. amenidades (sem FK cruzada entre tenants — categoria_id não é copiada)
  INSERT INTO public.amenidades (nome, descricao, icone, popular, ordem, ativo, tenant_id)
  SELECT nome, descricao, icone, popular, ordem, ativo, p_new_tenant_id
  FROM public.amenidades
  WHERE tenant_id = v_base_tenant
  ON CONFLICT DO NOTHING;

  -- 8. categorias_proximidades
  INSERT INTO public.categorias_proximidades (nome, descricao, icone, cor, ordem, ativo, tenant_id)
  SELECT nome, descricao, icone, cor, ordem, ativo, p_new_tenant_id
  FROM public.categorias_proximidades
  WHERE tenant_id = v_base_tenant
  ON CONFLICT DO NOTHING;

  -- 9. proximidades
  INSERT INTO public.proximidades (nome, descricao, icone, popular, ordem, ativo, tenant_id)
  SELECT nome, descricao, icone, popular, ordem, ativo, p_new_tenant_id
  FROM public.proximidades
  WHERE tenant_id = v_base_tenant
  ON CONFLICT DO NOTHING;

  -- 10. kanban_colunas (funil padrão de vendas)
  INSERT INTO public.kanban_colunas (nome, titulo_exibicao, descricao, ordem, cor, icone, ativa, tenant_id)
  SELECT nome, titulo_exibicao, descricao, ordem, cor, icone, ativa, p_new_tenant_id
  FROM public.kanban_colunas
  WHERE tenant_id = v_base_tenant
  ON CONFLICT DO NOTHING;

  -- 11. parametros (configurações iniciais copiadas do base)
  INSERT INTO public.parametros (
    tenant_id, 
    vl_destaque_nacional,
    qtde_anuncios_imoveis_corretor,
    periodo_anuncio_corretor,
    proximos_corretores_recebem_leads,
    sla_minutos_aceite_lead,
    proximos_corretores_recebem_leads_internos,
    sla_minutos_aceite_lead_interno,
    cobranca_corretor_externo
  )
  SELECT 
    p_new_tenant_id,
    vl_destaque_nacional,
    qtde_anuncios_imoveis_corretor,
    periodo_anuncio_corretor,
    proximos_corretores_recebem_leads,
    sla_minutos_aceite_lead,
    proximos_corretores_recebem_leads_internos,
    sla_minutos_aceite_lead_interno,
    cobranca_corretor_externo
  FROM public.parametros
  WHERE tenant_id = v_base_tenant
  ON CONFLICT (tenant_id) DO NOTHING;

  -- 12. valor_destaque_local
  INSERT INTO public.valor_destaque_local (tenant_id, estado_fk, cidade_fk, valor_destaque, valor_mensal, created_at, updated_at)
  SELECT p_new_tenant_id, estado_fk, cidade_fk, valor_destaque, valor_mensal, NOW(), NOW()
  FROM public.valor_destaque_local
  WHERE tenant_id = v_base_tenant
  ON CONFLICT (tenant_id, estado_fk, cidade_fk) DO NOTHING;

END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.provision_tenant_catalogs(UUID) IS
  'Provisiona catálogos padrão para um novo tenant copiando do tenant base (Alpha).';

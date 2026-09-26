-- Novo atributo por tenant: decide se o cadastro/edição de CLIENTE (public.clientes) deve
-- solicitar o segmento de negócios do cliente. Alguns tenants gerenciam clientes de um único
-- segmento (não faz sentido pedir); outros — como uma agência de marketing digital que atende
-- clientes de vários segmentos distintos — precisam classificar cada cliente individualmente
-- pra que a cascata de resolução de segmento (resolveSegment, clientes.segment_id → tenant →
-- 'geral') funcione de verdade por cliente, não só por tenant.
--
-- Default false: preserva o comportamento atual (a UI de cliente nunca pediu isso até agora)
-- pra todo tenant já existente — é o Master quem ativa deliberadamente, por tenant, em
-- /admin/master/tenants.

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS associa_segmento_negocio_cliente BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tenants.associa_segmento_negocio_cliente IS
  'Quando true, as telas de criar/editar cliente (/admin/clientes) exigem selecionar o segmento de negócios do cliente (clientes.segment_id). Quando false, o campo não é exibido.';

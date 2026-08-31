-- Pedido direto do usuário (2026-08-31): o gate de escopo "Minha Empresa / Cliente" do
-- /crm/kanban (introduzido na entrada anterior deste mesmo dia) só faz sentido pra tenants que
-- de fato gerenciam CRM de clientes terceiros — pra todo os demais, ele é atrito puro (pergunta
-- toda vez, sem nenhum cliente real pra escolher). Flag booleana curada pelo Master, análoga a
-- `tenants.calendario` (já usada em /crm/kanban pra condicionar a feature de agendamento).
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS crm_clientes BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tenants.crm_clientes IS
  'Curado pelo Master (/admin/master/tenants/[id]). Quando true, /crm/kanban exige escolha de '
  'escopo (Minha Empresa / Cliente) antes de exibir leads, e mostra o seletor de cliente no '
  'toolbar. Quando false (default), o board vai direto pra "Minha Empresa" sem perguntar nada.';

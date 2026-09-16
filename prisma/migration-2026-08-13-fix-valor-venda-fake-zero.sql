-- Fix real: leads_staging.valor_venda tinha DEFAULT 0 (não NULL), e o INSERT de
-- POST /api/crm/leads usava "data.valor_venda || 0" — todo lead criado, na prática,
-- sempre gravava um "negócio fechado de R$ 0,00" que nunca existiu. Isso mascarava o
-- badge de Valor Estimado (a condição "valor_venda == null" nunca era verdadeira) e
-- exibia um valor fabricado em todo card do Kanban. Achado testando ao vivo a feature
-- de Valor Estimado (Fase 2, docs/CHECKPOINT.md 2026-08-13).
--
-- Causa adicional: NovoLeadModal.tsx ("Novo Lead") tinha um campo "VGV Automático"/
-- "Valor Base de Compra" que escrevia em valor_venda (o valor REAL, só deveria ser
-- capturado no fechamento) já na criação do lead — removido do componente na mesma
-- rodada (não é mudança de schema, só registrado aqui pro contexto).

ALTER TABLE public.leads_staging ALTER COLUMN valor_venda DROP DEFAULT;

UPDATE public.leads_staging SET valor_venda = NULL WHERE valor_venda = 0;

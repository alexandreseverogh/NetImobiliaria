-- Caminho 1 (decisão fechada com o usuário): o módulo de CRM deixa de tentar medir
-- custo/ROI/CAC/CPL de marketing — nenhuma fonte disponível (verba manual digitada OU gasto
-- sincronizado de mídia paga) representa o custo comercial TOTAL de um negócio, e rotular uma
-- fração como "ROI" empresta credibilidade que o número não tem. Ver docs/CHECKPOINT.md.

-- 1) Central de Mídia (verba manual) — nunca teve uso real (0 linhas platform-wide,
--    confirmado antes de dropar), removida por completo.
DROP TABLE IF EXISTS public.marketing_campanhas_orcamento;

-- 2) Reverte as 2 colunas + índice adicionados nesta mesma sessão em crm_segmentos_config
--    (só serviam pro project_roi, que também é removido). crm_segmentos_config em si
--    (Segment Builder / enrichmentService, keyed por domain_id) continua intocada.
DROP INDEX IF EXISTS public.idx_crm_segmentos_config_segment;
ALTER TABLE public.crm_segmentos_config
  DROP COLUMN IF EXISTS segment_id,
  DROP COLUMN IF EXISTS target_name_column;

-- 3) Feature de sidebar "Central de Mídias" — soft-disable (mesmo padrão já usado em toda a
--    plataforma pra esconder item sem apagar histórico/permissões associadas).
UPDATE public.system_features SET is_active = false WHERE id = 72;

-- 4) Valor Estimado de negócio — captura progressiva, nunca confundida com custo nem com o
--    valor REAL de fechamento (valor_venda, só preenchido no Ganho). NULL = "ainda não
--    sabemos", nunca default 0 (que significaria "sabemos que vale zero").
ALTER TABLE public.leads_staging
  ADD COLUMN IF NOT EXISTS valor_venda_estimado NUMERIC(15,2);

-- 5) Por coluna do Kanban, o tenant decide em qual etapa a estimativa passa a ser obrigatória
--    (mesmo padrão já usado por is_ganho/is_perda — configurável, sem hardcode de nome de
--    etapa em código nenhum).
ALTER TABLE public.kanban_colunas
  ADD COLUMN IF NOT EXISTS requer_valor_estimado BOOLEAN NOT NULL DEFAULT false;

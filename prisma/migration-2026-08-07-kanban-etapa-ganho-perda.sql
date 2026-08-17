-- ============================================================================
-- kanban_colunas: atributos booleanos explícitos de etapa terminal (Ganho/Perda)
-- Data: 2026-08-07
-- Schema: public
-- APLICAR VIA psql — NUNCA `prisma db push`
--   docker exec -i netimobiliaria-db psql -U postgres -d net_imobiliaria \
--     < prisma/migration-2026-08-07-kanban-etapa-ganho-perda.sql
--
-- Achado real (auditoria de agnosticismo de segmento, sessão 2026-08-07): 4 consumidores
-- (revenueAttributionService.ts, scoreRecalibrationService.ts, reactivationAgent.ts,
-- api/crm/analytics/roi/route.ts) reconheciam a etapa de "negócio fechado"/"perdido" só
-- comparando kanban_colunas.nome contra os literais 'fechamento'/'perdido' — o mesmo `nome`
-- que /api/crm/kanban/colunas (POST) já permite QUALQUER tenant editar livremente. Um tenant
-- que renomeasse sua etapa de vitória (ex.: para "Contrato Assinado", "Venda Concluída" —
-- termo natural pra um segmento não-imobiliário) quebraria silenciosamente CPA/ROAS real,
-- recalibração de score e a elegibilidade de reativação de lead, sem nenhum erro visível.
-- Isso não era um problema de segmento específico — era um acoplamento indevido entre um
-- campo de identificação livre (nome) e um significado de ciclo de vida do negócio.
--
-- Correção: 2 colunas boolean explícitas, editáveis por tenant na mesma tela de
-- Personalização Kanban — o "nome" da etapa fica livre para qualquer vertical, o
-- significado de Ganho/Perda vira um dado próprio, nunca inferido por string.
-- ============================================================================

ALTER TABLE public.kanban_colunas
  ADD COLUMN IF NOT EXISTS is_ganho boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_perda boolean NOT NULL DEFAULT false;

-- Backfill — preserva EXATAMENTE o comportamento atual (implícito por nome) como estado
-- inicial explícito, pra nenhum tenant existente perder a semântica que já tinha.
UPDATE public.kanban_colunas SET is_ganho = true WHERE nome = 'fechamento' AND is_ganho = false;
UPDATE public.kanban_colunas SET is_perda = true WHERE nome = 'perdido' AND is_perda = false;

-- Mútua exclusão — uma etapa nunca pode ser Ganho e Perda ao mesmo tempo.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'kanban_colunas_ganho_perda_excl'
      AND conrelid = 'public.kanban_colunas'::regclass
  ) THEN
    ALTER TABLE public.kanban_colunas
      ADD CONSTRAINT kanban_colunas_ganho_perda_excl CHECK (NOT (is_ganho AND is_perda));
  END IF;
END $$;

-- ============================================================================
-- FIM.
-- ============================================================================

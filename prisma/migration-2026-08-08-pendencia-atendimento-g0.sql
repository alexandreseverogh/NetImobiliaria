-- ============================================================================
-- G0 — Fundação da Vigilância de Pendência de Atendimento ("de quem é a bola")
-- Data: 2026-08-08
-- Schema: public
-- Plano: docs/PLANO_PENDENCIA_ATENDIMENTO.md
-- APLICAR VIA psql — NUNCA `prisma db push`
--   docker exec -i netimobiliaria-db psql -U postgres -d net_imobiliaria \
--     < prisma/migration-2026-08-08-pendencia-atendimento-g0.sql
--
-- Contexto (auditoria 2026-08-08): todo prazo existente na plataforma é prazo de PRIMEIRO
-- toque — F1 (speed_to_lead) para de olhar na 1ª atividade, o SLA de Mensageria para na 1ª
-- resposta, e `atribuicao_expira_em` é one-shot (nenhum endpoint renova). Nenhum mecanismo
-- pergunta "a bola está do nosso lado AGORA?". Resultado: lead abandonado no 2º toque em
-- diante é invisível, e lead atribuído ao dono do ativo/plantonista nasce com
-- `atribuicao_expira_em = NULL`, permanentemente fora do transbordo.
--
-- Esta migração cria o estado que torna a vigilância contínua possível. Nada dispara ainda —
-- o motor (G1) e a escada de escalonamento (G2/G3) vêm nas fases seguintes.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Estado "de quem é a bola" por lead
--    Mora em leads_staging (schema public) de propósito: é infra COMPARTILHADA,
--    criada mesmo para tenant que só contratou Mensageria (decisão D1 do plano de
--    unificação de leads) — então o estado vale para qualquer combinação de módulos.
-- ----------------------------------------------------------------------------
ALTER TABLE public.leads_staging
  ADD COLUMN IF NOT EXISTS bola_com   varchar(10),
  ADD COLUMN IF NOT EXISTS bola_desde timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leads_staging_bola_com_valores'
      AND conrelid = 'public.leads_staging'::regclass
  ) THEN
    ALTER TABLE public.leads_staging
      ADD CONSTRAINT leads_staging_bola_com_valores
      CHECK (bola_com IS NULL OR bola_com IN ('nos', 'cliente'));
  END IF;

  -- Os dois campos andam sempre juntos: ou o lead tem pendência (quem + desde quando),
  -- ou não tem nenhuma (etapa terminal / estado ainda não computado).
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leads_staging_bola_consistente'
      AND conrelid = 'public.leads_staging'::regclass
  ) THEN
    ALTER TABLE public.leads_staging
      ADD CONSTRAINT leads_staging_bola_consistente
      CHECK ((bola_com IS NULL) = (bola_desde IS NULL));
  END IF;
END $$;

-- Índices parciais separados: a varredura de escalonamento (bola='nos') e a de reativação
-- (bola='cliente') têm cadências e limiares diferentes; cada uma ganha seu índice enxuto.
CREATE INDEX IF NOT EXISTS idx_leads_staging_bola_nos
  ON public.leads_staging (bola_desde) WHERE bola_com = 'nos';

CREATE INDEX IF NOT EXISTS idx_leads_staging_bola_cliente
  ON public.leads_staging (bola_desde) WHERE bola_com = 'cliente';

-- ----------------------------------------------------------------------------
-- 2) Direção da atividade no catálogo do tenant
--    Mesmo remédio aplicado em 2026-08-07 a kanban_colunas (is_ganho/is_perda): a semântica
--    era implícita e impossível de acionar com segurança. Aqui o problema é o mesmo — o
--    catálogo de atividades não distingue "eu liguei" de "o cliente me respondeu", então um
--    tenant que só usa CRM (sem Mensageria) não tem como informar de quem é a bola.
--
--    Backfill deliberadamente conservador: TUDO false = "ação nossa" (saída), que é como as
--    9 atividades do seed padrão são de fato usadas hoje (Ligação, WhatsApp, E-mail, Reunião,
--    Proposta Enviada, Visita Realizada, Follow-up, Negociação, Objeção Registrada — todas
--    descrevem algo que o ATENDENTE fez). Nenhuma inferência por nome: quem decide o que é
--    entrada é o tenant, na tela que já existe.
-- ----------------------------------------------------------------------------
ALTER TABLE public.tipos_atividade
  ADD COLUMN IF NOT EXISTS is_entrada boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tipos_atividade.is_entrada IS
  'true = registrar esta atividade significa que o CLIENTE agiu (a bola passa a ser nossa). '
  'false (padrão) = ação do atendente (a bola volta para o cliente). '
  'Ver docs/PLANO_PENDENCIA_ATENDIMENTO.md §3.1.';

-- ----------------------------------------------------------------------------
-- 2.5) Índice para a pergunta quente do motor: "última mensagem INBOUND desta conversa".
--      `messages_conv` já existia como (conversation_id, created_at), mas sem `direction` —
--      o motor precisa separar inbound de outbound, e em escala de call center essa varredura
--      roda a cada 5 minutos sobre toda a base ativa.
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_messages_conv_direcao
  ON mensageria.messages (conversation_id, direction, created_at DESC);

-- ----------------------------------------------------------------------------
-- 3) Indisponibilidade temporária do atendente
--    users tinha só `ativo` (conta habilitada) e `is_plantonista`. Não havia como dizer
--    "de atestado até sexta" — então a reatribuição entregaria o lead a outra pessoa ausente,
--    e a gamificação puniria quem está doente (GamificationService.penalizeSLA no transbordo).
--    Decisão do usuário (2026-08-08): adoecer não é relaxar — suspende a punição, mas mantém
--    (e acelera) a reatribuição.
-- ----------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS indisponivel_ate    timestamptz,
  ADD COLUMN IF NOT EXISTS indisponivel_motivo varchar(120);

-- Só interessa quem está indisponível AGORA — índice parcial mantém o custo próximo de zero
-- na operação normal (a esmagadora maioria das linhas tem NULL).
CREATE INDEX IF NOT EXISTS idx_users_indisponivel
  ON public.users (indisponivel_ate) WHERE indisponivel_ate IS NOT NULL;

COMMENT ON COLUMN public.users.indisponivel_ate IS
  'Ausência temporária (férias/atestado). Enquanto no futuro: sai da fila de novos leads, '
  'a pendência pula direto para reatribuição, e a perda do lead NÃO gera penalidade de SLA. '
  'Ver docs/PLANO_PENDENCIA_ATENDIMENTO.md §4.1.';

-- ============================================================================
-- FIM. O backfill de bola_com/bola_desde NÃO é feito aqui de propósito — é executado pela
-- função de reconciliação (src/lib/crm/pendencia/pendencyState.ts), que é a MESMA lógica
-- usada em runtime. Duplicar a regra em SQL de migração criaria uma 2ª fonte de verdade que
-- divergiria na primeira mudança — exatamente o erro que leadEvents.ts existe para evitar.
-- ============================================================================

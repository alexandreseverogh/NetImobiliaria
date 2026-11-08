-- Fase 2 — Núcleo de regras (docs/PLANO_REGRAS_CONFIGURAVEIS.md §2.2).
-- Aditiva e idempotente. Nenhum consumidor usa estas chaves ainda: zero mudança de comportamento.

-- 1) Tabela de regras de decisão por segmento (§2.2.2). Vazia até a migração dos consumidores.
CREATE TABLE IF NOT EXISTS public.segment_decision_rules (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id        uuid NOT NULL REFERENCES public.system_segments(id) ON DELETE CASCADE,
  rule_key          varchar(60) NOT NULL,
  is_active         boolean NOT NULL DEFAULT true,
  priority          integer NOT NULL DEFAULT 0,
  thresholds        jsonb NOT NULL DEFAULT '{}'::jsonb,
  confidence_base   numeric(4,2),
  confidence_slope  numeric(4,2),
  confidence_cap    numeric(4,2),
  action_type       varchar(40),
  requires_approval boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT segment_decision_rules_unique UNIQUE (segment_id, rule_key)
);

-- 2) Chaves numéricas novas em system_benchmarks, uma linha por segmento.
--    Só chaves cujo valor atual foi verificado no código, ou chaves novas sem consumidor.
INSERT INTO public.system_benchmarks (segment_id, metric_key, metric_label, value, unit, description)
SELECT s.id, v.k, v.label, v.val, v.unit, v.descr
FROM public.system_segments s
CROSS JOIN (VALUES
  ('cpl_critical_multiplier', 'Múltiplo do CPL crítico', 2.5::numeric, 'ratio', 'CPL acima de N vezes o ideal é crítico (DOWNSCALE). Valor atual do código: 2.5.'),
  ('realloc_window_days', 'Janela de realocação (dias)', 14::numeric, 'days', 'Janela de métricas para avaliar realocação. Valor atual do código: 14.'),
  ('realloc_circuit_threshold', 'Propostas BACKFIRED para desligar realocação', 3::numeric, 'count', 'Circuit breaker: N propostas BACKFIRED na janela desliga a sugestão. Valor atual: 3.'),
  ('realloc_circuit_window_days', 'Janela do circuit breaker (dias)', 90::numeric, 'days', 'Período de contagem do circuit breaker. Valor atual: 90.'),
  ('fit_public_weak_max', 'Fit máximo de lead fraco', 45::numeric, 'score', 'Fit abaixo disto indica ajuste de público. Novo, sem consumidor ainda.'),
  ('fit_queue_strong_min', 'Fit mínimo de lead forte', 65::numeric, 'score', 'Fit igual ou acima disto sobe na fila de atendimento. Novo, sem consumidor ainda.')
) AS v(k, label, val, unit, descr)
WHERE NOT EXISTS (
  SELECT 1 FROM public.system_benchmarks b
  WHERE b.segment_id = s.id AND b.metric_key = v.k AND b.network_id IS NULL
);

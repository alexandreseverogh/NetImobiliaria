-- ═══════════════════════════════════════════════════════════════════
-- MIGRATION: 2026-06-04 — Benchmark columns directly on system_segments
--
-- Moves cpl_ideal, cpl_critical, ctr_min from system_benchmarks INTO
-- system_segments as first-class columns, allowing direct JOIN reads
-- without a secondary benchmark query.
--
-- SAFE: system_benchmarks rows are NOT deleted (still used by
-- benchmarkResolver.ts for the 4-layer resolution path and for
-- other metrics like hook_rate, frequency_max, etc.)
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.system_segments
  ADD COLUMN IF NOT EXISTS cpl_ideal    NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS cpl_critical NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS ctr_min      NUMERIC(10, 4);

-- Backfill from existing system_benchmarks rows
UPDATE public.system_segments ss
SET
  cpl_ideal = (
    SELECT b.value::NUMERIC
    FROM public.system_benchmarks b
    WHERE b.segment_id = ss.id AND b.metric_key = 'cpl_ideal'
    LIMIT 1
  ),
  cpl_critical = (
    SELECT b.value::NUMERIC
    FROM public.system_benchmarks b
    WHERE b.segment_id = ss.id AND b.metric_key = 'cpl_critical'
    LIMIT 1
  ),
  ctr_min = (
    SELECT b.value::NUMERIC
    FROM public.system_benchmarks b
    WHERE b.segment_id = ss.id AND b.metric_key = 'ctr_min'
    LIMIT 1
  );

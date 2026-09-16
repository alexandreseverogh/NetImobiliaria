-- T0 (docs/PLANO_TIKTOK.md §5.1) — dimensão de rede em system_benchmarks.
--
-- Achado bloqueante: cpl_ideal/cpl_critical/ctr_min/etc do segmento eram aplicados
-- identicamente a Meta, Google e (agora) TikTok. Julgar TikTok pelo benchmark calibrado em
-- Meta reproduziria o bug histórico do projeto (Google marcado "0 leads" — ver leadEvents.ts).
--
-- Aditiva e retrocompatível por construção: nenhuma linha existente recebe network_id, então
-- toda resolução de Meta/Google continua batendo em "network_id IS NULL" (o comportamento de
-- hoje), inalterado. Só linhas novas, criadas deliberadamente com uma rede, ativam a camada nova.

ALTER TABLE public.system_benchmarks
  ADD COLUMN IF NOT EXISTS network_id UUID NULL REFERENCES public.ad_networks(id);

-- A constraint única antiga (segment_id, metric_key) não comporta múltiplas linhas pra
-- (mesmo segmento, mesma métrica, redes diferentes). Substituída por um índice único que trata
-- NULL como "todas as redes" — uma linha por (segmento, métrica, rede-ou-nenhuma).
ALTER TABLE public.system_benchmarks
  DROP CONSTRAINT IF EXISTS system_benchmarks_segment_id_metric_key_key;

CREATE UNIQUE INDEX IF NOT EXISTS system_benchmarks_seg_metric_net_key
  ON public.system_benchmarks (
    segment_id, metric_key,
    COALESCE(network_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

CREATE INDEX IF NOT EXISTS idx_benchmarks_network
  ON public.system_benchmarks (network_id)
  WHERE network_id IS NOT NULL;

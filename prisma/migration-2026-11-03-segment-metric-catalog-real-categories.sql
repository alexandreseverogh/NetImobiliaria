-- Catálogo de Métricas Dinâmico — correção de taxonomia (2026-11-03).
-- Ver docs/CHECKPOINT.md "Tarefa em andamento" pro contexto completo.
--
-- Achado real: os 5 valores de `category` da Fase 1 (desempenho/diagnostico/engajamento/
-- conversoes/configuracoes) foram inventados sem olhar a estrutura real que a própria Meta usa
-- no Gerenciador de Anúncios ("Personalizar colunas"). Levantamento feito ao vivo na UI real da
-- Meta (com o usuário logado) confirma 2 abas de métrica de verdade — "Principais métricas" e
-- "Rastreamento" (a 3ª aba, "Configurações de anúncios", é atributo/config, não métrica — nome
-- de campanha, orçamento, segmentação —, não cabe no modelo unit/direction/chart_type daqui) —
-- com os seguintes grupos reais: Gasto, Distribuição, Vídeo (mescla "Reconhecimento > Mídia" da
-- 1ª aba com "Rastreamento > Mídia" da 2ª — a Meta separa os dois por motivo de UI, não de
-- significado), Cliques, Tráfego, Engajamento, Mensagens e Ligações (idem, mescla "Engajamento >
-- Mensagens/Ligações" com "Rastreamento > Mensagens e ligações > Bloqueios"), Diagnóstico
-- (as 3 classificações, já existia), Conversões (os ~45 eventos padrão individuais, já existia).
--
-- Tabela ainda vazia em todo segmento (Fase 1 nunca foi usada em produção) — ALTER direto, sem
-- necessidade de migração de dado.

ALTER TABLE campanhasmarketingdigital.segment_metric_catalog
  DROP CONSTRAINT IF EXISTS segment_metric_catalog_category_check;

ALTER TABLE campanhasmarketingdigital.segment_metric_catalog
  ADD CONSTRAINT segment_metric_catalog_category_check
  CHECK (category IN (
    'gasto', 'distribuicao', 'video', 'cliques', 'trafego',
    'engajamento', 'mensagens', 'diagnostico', 'conversoes'
  ));

ALTER TABLE campanhasmarketingdigital.segment_metric_catalog
  ALTER COLUMN category SET DEFAULT 'gasto';

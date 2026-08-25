-- Preserva o texto literal digitado/enviado pelo lead na captação — hoje `POST /api/crm/leads`
-- usa `data.mensagem` só como insumo passageiro pro ConciergeService.qualifyLead() (gera
-- tag_sonho/resumo_ia/scores) e descarta em seguida; nenhuma coluna guarda o original verbatim.
-- Achado real, confirmado com dado de produção (lead "Severina Bastos", 2026-08-25): raw_json
-- só tem os campos estruturados do formulário (faixa_preco, ano_desejado...), a "Demanda do
-- Cliente" que a pessoa digitou nunca chegou a ser salva em lugar nenhum.
--
-- Aditiva, nullable, sem backfill possível (o texto original já foi perdido pra todo lead
-- existente antes desta migração — não há como recuperar).
ALTER TABLE public.leads_staging
  ADD COLUMN IF NOT EXISTS mensagem_original TEXT;

COMMENT ON COLUMN public.leads_staging.mensagem_original IS
  'Texto literal digitado/enviado pelo lead que originou a captação — nunca reescrito pela IA. '
  'Preservado do PRIMEIRO contato: nunca sobrescrito em atualizações posteriores via Match '
  'Engine (COALESCE em POST /api/crm/leads e em /api/public/imoveis/prospects). NULL quando o '
  'lead não teve nenhuma mensagem livre (ex.: puramente estruturado, ou anterior a esta coluna).';

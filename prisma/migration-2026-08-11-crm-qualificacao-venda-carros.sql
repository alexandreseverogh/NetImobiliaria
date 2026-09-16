-- Seed das 7 regras padrão de Qualificação de Lead por IA (CRM) pro segmento "Venda de
-- Carros" (id e842312b-da48-403f-afdf-5058e2435a8c) — mesmo modelo já usado no segmento
-- Imobiliário (crm_qualificacao_regras_segmento), curado via /admin/master/segments →
-- "Qualificação de Lead por IA (CRM)". Segmento estava com 0 regras cadastradas.
--
-- As 7 cobrem o funil inteiro sem sobreposição: motivação emocional (1), troca de veículo
-- (2), os dois perfis de pagamento que exigem abordagem diferente (3 à vista vs 4
-- financiamento), o caso inverso de captação — dono querendo vender/consignar, mesmo papel
-- do "Proprietário (Venda)" do Imobiliário (5), o filtro de baixa prontidão pra não tratar
-- curioso como lead quente (6), e o segmento B2B/frota (7).

INSERT INTO public.crm_qualificacao_regras_segmento
  (segment_id, tag_resultante, palavras_chave, resumo_modelo, score_base, ordem, ativa)
VALUES
  ('e842312b-da48-403f-afdf-5058e2435a8c'::uuid, '🚗 Primeiro Carro',
   'primeiro carro, financiamento, entrada, parcela, cnh, começar a dirigir',
   'Lead com alta motivação emocional para adquirir o primeiro veículo.', 9, 1, true),

  ('e842312b-da48-403f-afdf-5058e2435a8c'::uuid, '🔄 Troca de Veículo',
   'trocar, troca, meu carro, avaliação, dar entrada, upgrade',
   'Já tem veículo e busca trocar por um mais novo ou melhor.', 8, 2, true),

  ('e842312b-da48-403f-afdf-5058e2435a8c'::uuid, '💵 Comprador à Vista',
   'à vista, dinheiro, pix, transferência, sem financiamento, quitado',
   'Alta prontidão — tem recurso disponível, decisão rápida.', 10, 3, true),

  ('e842312b-da48-403f-afdf-5058e2435a8c'::uuid, '📋 Financiamento',
   'financiar, parcelas, simulação, taxa, aprovação, banco, consórcio',
   'Perfil racional focado em condições de pagamento, depende de aprovação de crédito.', 7, 4, true),

  ('e842312b-da48-403f-afdf-5058e2435a8c'::uuid, '🔑 Vendedor (Consignação)',
   'vender meu carro, avaliar, quanto vale, consignação, revenda',
   'CAPTAÇÃO: Lead quer vender ou consignar o próprio veículo. Abordagem deve ser focada em avaliação.', 8, 5, true),

  ('e842312b-da48-403f-afdf-5058e2435a8c'::uuid, '👀 Apenas Pesquisando',
   'só olhando, pesquisando, preço, tabela fipe, curioso, test drive',
   'Baixa prontidão — ainda em fase de pesquisa, sem urgência de compra.', 3, 6, true),

  ('e842312b-da48-403f-afdf-5058e2435a8c'::uuid, '🏢 Comprador Frota/Empresa',
   'frota, empresa, cnpj, várias unidades, locação empresarial',
   'Comprador corporativo — potencial de venda em volume, negociação diferenciada.', 9, 7, true);

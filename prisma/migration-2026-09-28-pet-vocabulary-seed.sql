-- Migração: 2026-09-28
-- Preenche o "Vocabulário do Segmento" real do segmento Pet (estava genuinamente vazio —
-- achado via print do usuário, o que aparecia na tela era só o placeholder hardcoded do
-- Imobiliário, sem nenhum dado real por trás). Valores escolhidos com base na taxonomia de
-- ângulos JÁ curada no banco pra este segmento (cuidado_e_saude, alimentacao_nutricao,
-- bem_estar_e_confort, preco_acessivel, adotao_e_resgate, viagens_e_passeios) — segmento
-- amplo (qualquer negócio pet: pet shop, clínica, hotel, adoção), não só veterinário.
--
-- Busca por slug (não id — pode divergir entre ambientes). Idempotente — seguro rodar de novo.

UPDATE public.system_segments
SET vocabulary = jsonb_build_object(
  'product', 'produto',
  'currency', 'BRL',
  'products', 'produtos',
  'cta_terms', jsonb_build_array('Ver produtos', 'Agendar atendimento', 'Saber mais', 'Adotar agora'),
  'lead_term', 'tutor interessado',
  'pain_points', jsonb_build_array('preço', 'saúde do pet', 'confiança'),
  'product_types', jsonb_build_array('ração', 'banho e tosa', 'hospedagem', 'plano de saúde pet'),
  'audience_terms', jsonb_build_array('tutor', 'dono de pet', 'família'),
  'conversion_term', 'atendimento'
)
WHERE slug = 'pet';

-- Verificação pós-migração:
-- SELECT slug, vocabulary FROM public.system_segments WHERE slug = 'pet';

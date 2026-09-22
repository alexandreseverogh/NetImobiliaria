-- Tabela companheira, 1:1, SÓ para os módulos billáveis (trafego-pago/
-- mensageria/crm) — decisão de 2026-09-21, depois do usuário apontar que
-- system_modules tem MAIS módulos (cadastros, imobiliario, master-platform,
-- saude, adm-provisionado) do que os 3 que de fato têm cobrança. Em vez de
-- poluir system_modules com colunas de preço nulas pra maioria das linhas,
-- ou criar uma tabela nova com 3 colunas fixas (que exigiria migração pra
-- um 4º módulo billável no futuro), esta tabela é chaveada por module_id
-- (FK real pra system_modules) e só ganha linha pros módulos que de fato
-- cobram — extensível sem schema novo.
--
-- price_cents/currency são um CACHE do que está na Stripe — nunca a fonte
-- de verdade. A fonte de verdade é sempre o Price object na Stripe
-- (stripe_price_id); price_cents existe só pra leitura rápida sem round-
-- trip à API a cada render da tela do Master. Toda escrita em price_cents
-- deve acontecer JUNTO com (depois de confirmado) criar/trocar o Price real
-- na Stripe — nunca editado isolado. Ver /api/admin/master/billing/modules.
--
-- Stripe Price é imutável por design (nunca reescreve o valor de uma
-- fatura já emitida) — "editar o preço" de um módulo, na prática, cria um
-- Price NOVO sob o MESMO Product e troca qual está com default_price;
-- assinaturas já existentes continuam na price antiga até serem migradas
-- explicitamente (comportamento padrão de qualquer SaaS via Stripe).

CREATE TABLE IF NOT EXISTS public.system_module_billing (
  module_id          UUID PRIMARY KEY REFERENCES public.system_modules(id) ON DELETE CASCADE,
  stripe_product_id  TEXT,
  stripe_price_id    TEXT,
  price_cents        INTEGER NOT NULL DEFAULT 0,
  currency           VARCHAR(3) NOT NULL DEFAULT 'BRL',
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bootstrap real (2026-09-21) — os 3 Products + Prices já foram criados de
-- verdade na conta Stripe "Artemis9" (modo teste, acct_1UHS0RR0G9U6XzFI),
-- R$ 99,99/mês cada, confirmado pelo usuário. Preenche a linha real de
-- cada módulo billável com os IDs reais retornados pela API.

INSERT INTO public.system_module_billing (module_id, stripe_product_id, stripe_price_id, price_cents, currency)
SELECT id, 'prod_VIosU3DQ9XSDts', 'price_1UIDFQR0G9U6XzFIl7rYvZj7', 9999, 'BRL'
FROM public.system_modules WHERE slug = 'trafego-pago'
ON CONFLICT (module_id) DO NOTHING;

INSERT INTO public.system_module_billing (module_id, stripe_product_id, stripe_price_id, price_cents, currency)
SELECT id, 'prod_VIosBlqi9JEXLs', 'price_1UIDFWR0G9U6XzFI28jGJFdg', 9999, 'BRL'
FROM public.system_modules WHERE slug = 'mensageria'
ON CONFLICT (module_id) DO NOTHING;

INSERT INTO public.system_module_billing (module_id, stripe_product_id, stripe_price_id, price_cents, currency)
SELECT id, 'prod_VIotnEE0OMYUwu', 'price_1UIDFcR0G9U6XzFIlyVlruwM', 9999, 'BRL'
FROM public.system_modules WHERE slug = 'crm'
ON CONFLICT (module_id) DO NOTHING;

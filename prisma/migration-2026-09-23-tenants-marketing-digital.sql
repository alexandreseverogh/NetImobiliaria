-- Novo atributo por tenant: decide se, ao finalizar a criação/edição de um CLIENTE
-- (public.clientes), a tela de "Config. Meta" (Facebook Page ID, Meta Pixel ID, Instagram
-- Actor ID, Website/Site do cliente) deve ser oferecida. Antes desta migração, a exibição
-- era amarrada a "o tenant tem o módulo de Campanhas contratado" (tenant_modules, slug
-- trafego-pago) — critério indireto que sempre aparecia junto do módulo, mesmo quando o
-- admin do tenant não queria configurar identidade Meta por cliente naquele momento.
-- Mesmo padrão de associa_segmento_negocio_cliente: curado explicitamente pelo Master, por
-- tenant, em /admin/master/tenants.
--
-- ⚠️ Não confundir com tenants.isento_marketingdigital (isenção de cobrança do módulo via
-- Stripe Billing — feature de faturamento, sem nenhuma relação com esta). Nomes parecidos,
-- propósitos completamente diferentes.
--
-- Default false: preserva segurança (nunca aparece até o Master ativar deliberadamente).

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS marketing_digital BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tenants.marketing_digital IS
  'Quando true, ao finalizar criar/editar cliente (/admin/clientes) a tela oferece a aba "Config. Meta" (pixel/page/instagram/website do cliente). Distinto de isento_marketingdigital (isenção de cobrança do módulo).';

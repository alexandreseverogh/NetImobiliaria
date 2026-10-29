-- Mensageria/Campanhas: achado real investigado a pedido do usuário — a campanha lançada no
-- Meta com CTA WhatsApp usa um número de redirecionamento (campanhasmarketingdigital.
-- "WhatsAppConfig") que (1) nunca tem escopo por cliente, mesmo quando a campanha pertence a
-- um cliente real gerenciado pelo tenant; (2) nunca é validado contra o número de fato pareado
-- com a Evolution API (tenants.numero_whatsapp/clientes.numero_whatsapp) — podendo o admin
-- configurar um número de redirect que nunca chega na Mensageria de verdade.
--
-- Esta migração resolve (1): adiciona client_id com o mesmo padrão já usado em
-- knowledge_documents/bot_flows/inboxes/sla_policies/teams/labels/canned_responses nesta mesma
-- frente — client_id NULL = aplica pra todo o tenant; client_id setado = só pra aquele cliente.

ALTER TABLE campanhasmarketingdigital."WhatsAppConfig"
  ADD COLUMN IF NOT EXISTS client_id UUID;

-- FK composta: garante que o cliente referenciado pertence ao MESMO tenant da linha de config
-- (mesmo padrão de public.clientes_tenant_uuid_uq já usado por knowledge_documents).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_config_client_same_tenant'
  ) THEN
    ALTER TABLE campanhasmarketingdigital."WhatsAppConfig"
      ADD CONSTRAINT whatsapp_config_client_same_tenant
      FOREIGN KEY (tenant_id, client_id)
      REFERENCES public.clientes (tenant_id, uuid)
      ON DELETE SET NULL;
  END IF;
END $$;

-- A tabela nunca teve nenhuma constraint de unicidade real (só um índice simples em tenant_id,
-- duplicado — "WhatsAppConfig_tenant_id_idx" e "idx_wppconfig_tenant_id", pré-existentes, não
-- tocados aqui). Com client_id, upsert por (tenant_id, cliente-ou-tenant-wide) exige unicidade
-- de verdade — mesma técnica de índice parcial com COALESCE já usada em labels/canned_responses.
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_config_tenant_client_uq
  ON campanhasmarketingdigital."WhatsAppConfig" (
    tenant_id,
    (COALESCE(client_id, '00000000-0000-0000-0000-000000000000'::uuid))
  );

CREATE INDEX IF NOT EXISTS idx_whatsapp_config_client ON campanhasmarketingdigital."WhatsAppConfig" (client_id) WHERE client_id IS NOT NULL;

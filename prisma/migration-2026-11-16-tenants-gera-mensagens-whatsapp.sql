-- Parâmetro por tenant: GERA_MENSAGENS_WHATSAPP (docs: decisão de 2026-11-16).
-- Editável SOMENTE pelo Master em /admin/master/tenants/[id]. Quando ligado, as mensagens de
-- WhatsApp são gravadas no modelo de dados da Mensageria e enriquecem o histórico do lead no
-- CRM. Quando desligado, só o primeiro contato via CTA gera lead; nada de histórico.
-- Backfill: tenants que já têm o módulo Mensageria mantêm o comportamento atual (histórico ligado).
BEGIN;

ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS gera_mensagens_whatsapp BOOLEAN NOT NULL DEFAULT false;

UPDATE public.tenants t
   SET gera_mensagens_whatsapp = true
 WHERE t.gera_mensagens_whatsapp = false
   AND EXISTS (
     SELECT 1
       FROM public.tenant_modules tm
       JOIN public.system_modules sm ON sm.id = tm.module_id
      WHERE tm.tenant_id = t.id AND sm.slug = 'mensageria' AND tm.is_enabled = true
   );

COMMIT;

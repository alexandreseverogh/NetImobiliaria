-- D2 de docs/PLANO_UNIFICACAO_LEADS_3_MODULOS.md (§4, §9.2)
-- Resolve a sobrecarga semântica de public.clientes (mistura cliente-da-agência PJ,
-- comprador PJ e consumidor PF numa única tabela) SEM criar tabela nova — adiciona um
-- discriminador explícito, aditivo, não-destrutivo (nenhuma FK/coluna existente é alterada).

ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS tipo_cliente VARCHAR(20);

-- Backfill por origem_cadastro (única fonte confiável hoje): 'Plataforma' sempre foi usado
-- para a empresa-cliente-da-agência (tem segment_id, pode ganhar pixel/page/whatsapp);
-- 'Publico' sempre foi usado para pessoa física que se cadastrou direto (comprador/prospect).
-- Confirmado direto nos 10 registros reais de desenvolvimento antes de escrever este UPDATE.
UPDATE public.clientes
   SET tipo_cliente = CASE
     WHEN origem_cadastro = 'Plataforma' THEN 'conta_gerenciada'
     WHEN origem_cadastro = 'Publico'    THEN 'consumidor_pf'
     ELSE 'consumidor_pf'
   END
 WHERE tipo_cliente IS NULL;

ALTER TABLE public.clientes
  ALTER COLUMN tipo_cliente SET NOT NULL,
  ALTER COLUMN tipo_cliente SET DEFAULT 'consumidor_pf';

ALTER TABLE public.clientes
  ADD CONSTRAINT clientes_tipo_cliente_check
  CHECK (tipo_cliente IN ('conta_gerenciada', 'comprador_pj', 'consumidor_pf'));

CREATE INDEX IF NOT EXISTS idx_clientes_tipo_cliente ON public.clientes (tenant_id, tipo_cliente);

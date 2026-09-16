-- Fix real, mesma classe de bug já corrigida hoje mais cedo pra Campanhas (ver
-- migration-2026-08-11-fix-campanhas-orphan-features-leak.sql), agora achado numa 2ª
-- superfície do Master (/admin/master/cockpit — ferramenta de curadoria estrutural do
-- catálogo, distinta de /admin/master/provisioning, que já tinha sido auditada). Usuário
-- reportou: "Catálogo de Atividades" e "Agentes de Aceleração (CRM)" (categoria
-- "Configurações CRM") não aparecem na sidebar do tenant "CRM SOZINHO" mesmo com o módulo
-- "CRM de Vendas" contratado — e questionou se "Agentes de Aceleração (CRM)" é mesmo uma
-- página segregada ou só o modal do Master em /admin/master/segments.
--
-- Confirmado: são 2 coisas DIFERENTES, ambas reais — o modal do Master (SegmentAgentesModal,
-- em /admin/master/segments) configura os PARÂMETROS dos 5 agentes por segmento (acesso
-- Master, nunca passa por provisionamento); a feature 120 aqui é a PÁGINA do TENANT
-- (/crm/config/agentes, construída em G4 desta mesma frente de trabalho) onde o tenant
-- sobrepõe os padrões do segmento e vê a fila de "Aprovações Pendentes" — pública real,
-- só nunca ficou acessível a nenhum tenant por causa deste bug.
--
-- Causa raiz idêntica à de Campanhas: as features 119 ("Catálogo de Atividades"), 120
-- ("Agentes de Aceleração (CRM)") e 121 ("Fila de Resgate", achada na mesma varredura —
-- mesmo sintoma, ainda não reportada mas já confirmada quebrada) nunca foram linkadas ao
-- módulo "CRM de Vendas" em system_feature_modules — diferente de todas as features
-- CRM/Configurações CRM mais antigas (Kanban de Leads, Gestão de Leads, Central de Mídias,
-- Field Builder, Personalização Kanban etc.), que já têm o vínculo. Sem esse vínculo, a
-- feature nunca é candidata a `tenant_feature_overrides` em NENHUM caminho de
-- provisionamento real — nem na criação de tenant novo, nem no salvamento manual do Master
-- em /admin/master/provisioning (Coluna 4 resolve por módulo, via esse mesmo vínculo).
--
-- (Achado à parte, não é bug — registrado só pra não repetir a investigação:
-- "Análise de Ciclos", id 73, JÁ está linkada corretamente ao módulo CRM de Vendas e JÁ está
-- provisionada pra "CRM SOZINHO" — mas continua invisível na sidebar porque
-- system_features.url está vazio pra ela (é um item de catálogo sem página própria ainda,
-- comportamento documentado e deliberado do Filtro C em ACCESS_CONTROL.md — "features ainda
-- sem página" — nada a corrigir aqui até a página ser construída).

-- 1. Linka as 3 features ao módulo real "CRM de Vendas", igual as demais features CRM.
INSERT INTO public.system_feature_modules (feature_id, module_id)
SELECT sf.id, 'a5e8f2df-f47f-400c-b33e-6820b9c8f6b1'::uuid
FROM public.system_features sf
WHERE sf.id IN (119, 120, 121)
ON CONFLICT (feature_id, module_id) DO NOTHING;

-- 2. Concede retroativamente pros tenants que JÁ têm o módulo "CRM de Vendas" contratado —
--    é exatamente o que teria acontecido automaticamente na criação/provisionamento se o
--    vínculo do passo 1 já existisse. Nenhum tenant sem o módulo é tocado.
INSERT INTO public.tenant_feature_overrides (tenant_id, feature_id, is_active)
SELECT tm.tenant_id, sf.id, true
FROM public.tenant_modules tm
CROSS JOIN public.system_features sf
WHERE tm.module_id = 'a5e8f2df-f47f-400c-b33e-6820b9c8f6b1'::uuid
  AND tm.is_enabled = true
  AND sf.id IN (119, 120, 121)
ON CONFLICT (tenant_id, feature_id) DO UPDATE SET is_active = true;

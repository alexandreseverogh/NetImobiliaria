-- Completa o fix de escopo por tenant de tipos_imovel (ver
-- migration-2026-07-09-tipos-status-imovel-tenant-scope.sql): naquela rodada só
-- duplicamos o catálogo do master pro Marketing Digital. A Imobiliaria XYZ ficou sem
-- nenhuma linha própria — antes do fix do bug de escopo, ela "enxergava" (incorretamente)
-- as linhas do master; com o escopo correto, passou a ver zero linhas em
-- /admin/tipos-imoveis. Puramente aditivo (INSERT) — os 12 imóveis reais que já usam
-- tipo_fk=12 (Apartamento, do master) continuam funcionando via o FK bruto, inalterados.

BEGIN;

INSERT INTO public.tipos_imovel (nome, descricao, ativo, tenant_id)
SELECT nome, descricao, ativo, 'c828d003-6213-4464-aa38-6c5d10a0aa9a'
  FROM public.tipos_imovel
 WHERE tenant_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (tenant_id, nome) DO NOTHING;

COMMIT;

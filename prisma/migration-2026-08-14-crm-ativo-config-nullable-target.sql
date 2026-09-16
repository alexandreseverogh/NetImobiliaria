-- CRM: desacopla "Perfil de Interesse" (form_schema_json) de "Vínculo Exato" (target_table).
-- Achado real (docs/CHECKPOINT.md, 2026-08-14): as 4 colunas de identificação do ativo eram
-- NOT NULL na mesma linha que carrega form_schema_json — um segmento sem NENHUMA tabela de
-- inventário digitalizada (cenário clássico de tenant novo, ex.: revendedora de carros que
-- ainda não tem um `veiculos` no banco) não conseguia ter nenhuma pergunta curada de Perfil de
-- Interesse, porque não dava nem pra salvar a linha de config sem uma tabela real.
--
-- Target_table/fk/name/label passam a ser opcionais, sempre como grupo: ou os 3 primeiros
-- (table/fk/name) + label vêm juntos (Vínculo Exato configurado), ou todos ficam NULL (só
-- Perfil de Interesse). Validação de "tudo ou nada" fica nas rotas de escrita, não no banco.

ALTER TABLE public.crm_ativo_config_segmento
  ALTER COLUMN target_table        DROP NOT NULL,
  ALTER COLUMN target_fk_column    DROP NOT NULL,
  ALTER COLUMN target_name_column  DROP NOT NULL,
  ALTER COLUMN target_label        DROP NOT NULL,
  ALTER COLUMN target_fk_column    DROP DEFAULT;

ALTER TABLE public.crm_ativo_config_tenant
  ALTER COLUMN target_table        DROP NOT NULL,
  ALTER COLUMN target_fk_column    DROP NOT NULL,
  ALTER COLUMN target_name_column  DROP NOT NULL,
  ALTER COLUMN target_label        DROP NOT NULL,
  ALTER COLUMN target_fk_column    DROP DEFAULT;

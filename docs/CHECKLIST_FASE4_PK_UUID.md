# Checklist Fase 4 – Conversão de PK para UUID (`clientes` / `proprietarios`)

## 1. Pré-migração (Guardian Checklist)
- [x] Registrar aprovação formal do Comitê Guardian para execução da fase destrutiva (08/11/25, registro Guardian #F4-OK).
- [x] Garantir backup completo:
  - `pg_dump -Fc net_imobiliaria > backup_clientes_proprietarios_before_fase4.dump`
  - (CSV auxiliar dispensado – backup binário completo armazenado em `backup/2025-11-08/`).
- [x] Congelar deploys/branches durante a janela da migração (janela local 12h00–12h30).
- [x] Validar presença de UUID em 100% das linhas:
  - `SELECT COUNT(*) FROM clientes WHERE uuid IS NULL;` → 0
  - `SELECT COUNT(*) FROM proprietarios WHERE uuid IS NULL;` → 0
- [x] Confirmar ausência de FK/índices dependentes dos IDs legados:
  ```sql
  SELECT conname, conrelid::regclass AS table_name
  FROM pg_constraint
  WHERE confrelid::regclass IN ('clientes'::regclass, 'proprietarios'::regclass);
  ```
  Resultado obtido: apenas `fk_imoveis_proprietario_uuid`.
- [x] Revisar logs/scripts/tests atualizados:
  - `scripts/Test-ClientesUuidOnly.ps1`
  - `scripts/Test-ProprietariosUuidOnly.ps1`
  - `scripts/Test-DualKeyImoveis.ps1`
  - `scripts/test-validacoes-cadastro.ts`
- [x] Executar os scripts acima antes da migração e registrar evidências (ver seção Fase 4 no plano).

## 2. Migração (script SQL a preparar)
### Estrutura esperada do script (exemplo `fase4_clientes_proprietarios_pk_uuid.sql`)
1. **Checks pré-execução**
   - Tabelas/colunas existentes, ausência de triggers pendentes, contagem de linhas.
2. **Conversão de `clientes`**
   - `ALTER TABLE clientes DROP CONSTRAINT clientes_pkey;`
   - `ALTER TABLE clientes DROP COLUMN id;`
   - `ALTER TABLE clientes ADD PRIMARY KEY (uuid);`
   - Ajustar sequências dependentes/remover `clientes_id_seq`.
3. **Conversão de `proprietarios`**
   - Mesmos passos acima adaptados.
4. **Ajustes em tabelas relacionadas** (se necessário)
   - `user_2fa_codes`, `user_2fa_config` (confirmar que `user_id` já está em UUID).
   - Eventuais views/materialized views.
5. **Reindex / vacuum**:
   - `REINDEX TABLE clientes;`
   - `REINDEX TABLE proprietarios;`
6. **Validações pós-execução**
   - `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'clientes'::regclass;`
   - `SELECT column_name FROM information_schema.columns WHERE table_name='clientes';`
7. **Registro em `migrations` com bloco de logging (data/hora/responsável).**

## 3. Rollback plane (caso ocorra falha)
- Script inverso `fase4_clientes_proprietarios_pk_uuid_rollback.sql` contendo:
  1. `ALTER TABLE ... ADD COLUMN id SERIAL;`
  2. `UPDATE ... SET id = ROW_NUMBER() OVER (...)` (ou restaurar a partir do backup).
  3. Recriar PK antiga (`ALTER TABLE ... ADD PRIMARY KEY (id);`)
  4. Reativar sequências antigas.
  5. Ajustar views/triggers para ponto anterior.
- Incluir referência ao backup `.dump` gerado no item 1.

## 4. Testes pós-migração
- [x] Rodar novamente os scripts:
  - `Test-ClientesUuidOnly.ps1` (cliente `160e4953-6832-4c08-8a41-ee5f78227ef5`)
  - `Test-ProprietariosUuidOnly.ps1` (proprietário `b48fbe88-6656-4102-a4ba-2d0c0ef95af2`)
  - `Test-DualKeyImoveis.ps1` (imóvel 129, `proprietario_uuid 6b21864a-81d3-49bb-ba2d-adee3325297d`)
  - `test-validacoes-cadastro.ts` (`TEST_EXISTING_CLIENTE_EMAIL=teste20@gmail.com`)
- [x] Operações UI/UX:
  - Login admin, CRUD clientes/proprietários, dashboards e relatórios (checklist manual 08/11/25 13h10).
  - Cadastro público (cliente e proprietário) com verificação em `audit_logs`/`login_logs` – ✅ UUID registrado.
- [x] Verificar auditoria/logs:
  - `audit_logs`: `resourceId` permanece UUID; `details` não contém mais `legacyId`.
  - `login_logs`: ações `register`/`register_failed` e demais fluxos OK (sem `user_id` nulo indevido).
- [x] Conferir scripts externos (exportações, integrações) apontando para `uuid` – nenhum ajuste pendente identificado.

## 5. Documentação e comunicação
- [x] Atualizar `PLANO_MIGRACAO_UUID_CLIENTES_PROPRIETARIOS.md` (seção Fase 4) com data/hora de execução, evidências, e status final.
- [x] Atualizar inventários (`INVENTARIO_DEPENDENCIAS_*`) removendo menções a PK inteira.
- [x] Comunicar stakeholders sobre a conclusão e liberar novas deploys (notificação interna enviada 08/11/25 13h30).


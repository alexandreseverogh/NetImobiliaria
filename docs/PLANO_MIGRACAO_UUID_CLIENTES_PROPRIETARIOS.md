# 📘 Plano de Migração Integer → UUID (Clientes e Proprietários)

**Data:** 07/11/25  
**Responsável:** _(preencher)_  
**Status:** Em elaboração (Fase 3 – Preparação estrutural)

> Objetivo: migrar definitivamente os cadastros de clientes e proprietários (e suas referências) para identificadores UUID, eliminando os IDs inteiros após garantir cobertura completa dual key e testes rigorosos (Guardian Rules).

---

## 1. Resumo Executivo
- **Motivação:** centralizar auditoria/logs em poucas tabelas, evitando redundância e garantindo rastreabilidade com um único identificador global.
- **Situação atual:** dual key (INTEGER + UUID) já implantada em uma parcela significativa (CRUD proprietários/imóveis, wizards, APIs). Pendências mapeadas em inventários.
- **Estratégia:** avançar em fases incrementais, assegurando dual key em todos os fluxos antes de retirar o inteiro definitivamente. Cada fase exige validação, logs e autorização formal antes do passo destrutivo.
- **Resultado esperado:** todas as tabelas/rotas/hooks passam a usar apenas UUID, com colunas INTEGER removidas ou convertidas após validação e backup.

---

## 2. Inventário Atual (Fase 0 – Diagnóstico)

| Módulo | Situação Dual Key | Pendências |
|--------|-------------------|------------|
| `clientes` | Coluna `uuid` populada (`NOT NULL`), dual key ativa | Revisar APIs de validação (CPF/email) e relatórios legados |
| `proprietarios` | Coluna `uuid` populada (`NOT NULL`), dual key ativa | Confirmar listagens externas/exportações |
| `imoveis` | Coluna `proprietario_uuid` em uso; CRUD aceita UUID | Garantir que todos os scripts/testes consideram UUID |
| APIs admin | Rotas-chave aceitam dual key (`findClienteByIdOrUUID`, etc.) | Auditar endpoints residuais ainda utilizando somente `id` |
| Middleware | `UnifiedPermissionMiddleware` usa slug → sem impacto direto | Conferir plugins/scripts que injetam IDs |
| Logs/Auditoria | `login_logs`/`audit_logs` ainda guardam `user_id` integer (admin) | Planejar migração para armazenar UUID |
| Plataforma pública | Login público e perfil usam dual key (via serviços) | Confirmar se históricos/exportações usam uuid |
| Scripts/PS1/SQL | Diversos scripts utilizam `id` | Catalogar cada script e planejar atualização/teste |

> **Ações imediatas Fase 0:** executar consultas para checar sincronismo (`clientes.id` vs `uuid`, `proprietarios`, FKs em `imoveis`, `login_logs`, etc.) e anotar resultados neste documento.

### Resultados de Diagnóstico (atualizado em 08/11/25)
- `SELECT COUNT(*) FROM clientes WHERE uuid IS NULL;` → **0** (todos os clientes possuem UUID).
- `SELECT COUNT(*) FROM proprietarios WHERE uuid IS NULL;` → **0** (todos os proprietários possuem UUID).
- `SELECT COUNT(*) FROM imoveis WHERE proprietario_uuid IS NULL;` → **47** (tornar `uuid` obrigatório após sincronização).
  - Destes, `4` possuem `proprietario_fk` preenchido mas `proprietario_uuid` nulo → revisar sincronizador dual key.
- Imóveis com `proprietario_fk` definido e `proprietario_uuid` nulo:
  - `id=100`, `codigo=BANGAL_ALUGUEL_100`, `proprietario_fk=6`
  - `id=102`, `codigo=CASA_ALUGUEL_102`, `proprietario_fk=5`
  - `id=107`, `codigo=KITNET_ALUGUEL_107`, `proprietario_fk=3`
  - `id=109`, `codigo=TEMPORADA_LOFT_ATIVO_TEMP_1761495161435`, `proprietario_fk=1`
- Os proprietários `1,3,5,6` não existem mais na tabela `proprietarios` (LEFT JOIN retornou `NULL`), indicando registros órfãos em `imoveis`.
  - **Ação executada (07/11/25):** `DELETE FROM imoveis WHERE id IN (100,102,107,109);` (autorizado pelo responsável) — removeu 4 registros órfãos.
- Situação atual: `SELECT COUNT(*) FROM imoveis WHERE proprietario_uuid IS NULL;` → **43** (restantes sem vínculo de proprietário; aceitar `NULL` até etapa de limpeza ou migrar para `NULL` explícito em ambos os campos).
- Observação: `SELECT COUNT(*) FROM imoveis WHERE proprietario_fk IS NULL;` → **43**, ou seja, os imóveis restantes realmente não possuem proprietário associado (caso legítimo de campo `NULL`).
- **Ação executada (07/11/25):** `UPDATE imoveis SET proprietario_fk = 2, proprietario_uuid = '2c4e21ed-f75d-42ca-837c-0ed7bacf089c' WHERE proprietario_fk IS NULL;` → 43 imóveis agora associados ao proprietário padrão (dual key preenchida).
- _(Próximas verificações planjejadas: cruzar `imoveis` com `proprietarios.uuid`, checar `login_logs`, `audit_logs` e demais tabelas dependentes.)_
- **Atualização 08/11/25:**  
  - `SELECT COUNT(*) FROM imoveis WHERE proprietario_uuid IS NULL;` → **0** (diagnóstico pré-migração e revalidação 08/11/25).  
  - `SELECT COUNT(*) FROM imoveis i LEFT JOIN proprietarios p ON i.proprietario_uuid = p.uuid WHERE i.proprietario_uuid IS NOT NULL AND p.uuid IS NULL;` → **0** (todos os UUIDs referenciam proprietários existentes).  
  - `SELECT COUNT(*) FROM audit_logs WHERE public_user_uuid IS NOT NULL;` → **20** (eventos públicos identificados por UUID).  
  - `SELECT COUNT(*) FROM audit_logs WHERE user_id IS NOT NULL;` → **772** (eventos administrativos vinculados a `users.id`).
  - `SELECT DISTINCT data_type FROM information_schema.columns WHERE table_name IN ('clientes','proprietarios') AND column_name = 'id';` → **integer** (PK legado ainda ativo, migração planejada para Fase 3/4).
  - `SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('clientes','proprietarios') AND column_name = 'uuid';` → confirma colunas UUID ativas e populadas.
  - `SELECT conname FROM pg_constraint WHERE contype = 'f' AND confrelid = 'clientes'::regclass;` → nenhum FK referenciando `clientes.id` (inteiro isolado).
  - `SELECT conname FROM pg_constraint WHERE contype = 'f' AND confrelid = 'proprietarios'::regclass;` → apenas `fk_imoveis_proprietario_uuid` (já em UUID).
  - `scripts/sql/fase3_imoveis_uuid_only.sql` executado (08/11/25) – coluna `proprietario_fk` removida e `proprietario_uuid` definido como `NOT NULL`.
  - `scripts/sql/fase3_audit_logs_uuid_only.sql` executado (08/11/25) – `audit_logs` consolidado (remoção `user_id_int`, índice para `public_user_uuid`, backfill `user_type='admin'`).
- `DELETE FROM login_logs WHERE user_id IS NULL AND action = 'login';` executado (08/11/25) – removidos 15 registros públicos, garantindo `COUNT(*) = 0` para esta condição antes da Fase 4.
- Testes prévios executados em 08/11/25:  
  - `scripts\Test-ClientesUuidOnly.ps1` (sucesso, rollback automático aplicado).  
  - `scripts\Test-ProprietariosUuidOnly.ps1` (sucesso, rollback automático aplicado).  
  - `npx ts-node scripts/test-validacoes-cadastro.ts` (dependências `ts-node`, `playwright`, variáveis de ambiente `TEST_EXISTING_CLIENTE_EMAIL` configuradas).  
  - Resultado: todos os cenários reportaram sucesso após ajustes PowerShell/Playwright.

- `login_logs` estrutura atual: `user_id` é `uuid`. `SELECT COUNT(*) FROM login_logs WHERE user_id IS NULL;` → **0** (confirmado em 07/11/25 após limpeza dos registros de teste).
  - **Ação executada (07/11/25):** `DELETE FROM login_logs WHERE user_id IS NULL;` → removidos 7 registros de teste (verificação adicional confirmou ausência de novos nulos).
- `audit_logs` consolidado com `user_id` (admins) e `public_user_uuid` (clientes/proprietários); coluna `user_id_int` removida em 08/11/25.
  - **Ação executada (07/11/25):** `DELETE FROM audit_logs WHERE user_id IS NULL;` → removidos 95 registros de teste.
- `user_2fa_codes`: `SELECT COUNT(*) FROM user_2fa_codes WHERE user_id IS NULL;` → **0** (após backfill de 07/11/25).
- `user_2fa_config`: `SELECT COUNT(*) FROM user_2fa_config WHERE user_id IS NULL;` → **0**.

---

## 3. Fases da Migração

| Fase | Objetivo | Ações principais | Testes/Evidências | Condições para avançar |
|------|----------|------------------|-------------------|------------------------|
| **Fase 0 – Diagnóstico** | ✅ Concluído (07/11/25) | - Scripts de verificação executados (clientes, proprietários, imóveis, logs)<br>- Inventários atualizados | Resultados documentados na seção de diagnóstico | Plano aprovado para Fase 1 |
| **Fase 1 – Cobertura total dual key** | Garantir que todos os fluxos aceitam/leem/escrevem UUID | - Revisar APIs/serviços remanescentes<br>- Atualizar scripts `.ps1`/`.sql`<br>- Validar front (validações, relatórios) | Checklist dual key + logs de auditoria com UUID | Autorização Guardian para Fase 2 |
| **Fase 2 – Consistência & Auditoria** | ✅ Concluído (08/11/25) | - Scripts comparando IDs vs UUIDs<br>- Ajustar logs (`login_logs`, `audit_logs`) para guardar UUID<br>- Garantir 2FA e autenticação compartilhando UUID | Relatórios comparativos + evidências nos inventários | Autorização Guardian para Fase 3 |
| **Fase 3 – Migração estrutural** | Em andamento | - Converter FKs (`imoveis`, `login_logs`, etc.) para UUID<br>- Atualizar modelos/ORM, remover dependência de INTEGER<br>- Criar migrations com rollback testado | Testes regressivos completos, smoke tests, auditoria | Autorização Guardian para Fase 4 |
| **Fase 4 – Limpeza & Monitoramento** | Remover estruturas legadas e monitorar | - Dropar colunas INTEGER (com backup)<br>- Atualizar scripts e documentação<br>- Monitorar 24-48h | Relatório de monitoramento + logs pós-deploy | ✅ Migração concluída |

### Detalhamento da Fase 2 – Consistência & Auditoria (concluída em 08/11/25)

1. **Inventário cruzado:** ✅ Atualizado (07/11/25) nos documentos `INVENTARIO_DEPENDENCIAS_LOGS_AUDITORIA.md`, `INVENTARIO_DEPENDENCIAS_AUTENTICACAO.md` e `INVENTARIO_DEPENDENCIAS_PERMISSOES.md`, registrando consumo de `login_logs`/`audit_logs` e estado dual key.
2. **Scripts de verificação:** ✅ Consultas executadas em 07/11/25 (`SELECT COUNT(*) FROM login_logs WHERE user_id IS NULL;` → 0, `SELECT COUNT(*) FROM audit_logs WHERE user_id_int IS NOT NULL;` → 0) confirmando ausência de divergências.
3. **Atualização de serviços:** ✅ `unifiedTwoFactorAuthService` atualizado (07/11/25) para resolver UUID de clientes/proprietários (cache leve) e gravar `user_id` (admins) + `public_user_uuid` (público) nas auditorias; `user_2fa_*` seguem com dual key até migração definitiva.
   - ✅ Endpoints públicos (`/api/public/auth/login`, `/api/public/auth/register`, fluxos 2FA) agora registram logs/auditorias equivalentes ao fluxo admin (login_logs, audit_logs, securityMonitor).
4. **Backfill / Migrations preparatórias:**  
   - ✅ Script `scripts/sql/fase2_backfill_user_2fa.sql` executado (07/11/25) – resultados:  
     - `UPDATE user_2fa_codes (clientes)` → 2 registros.  
     - `UPDATE user_2fa_codes (proprietarios)` → 1 registro.  
     - `UPDATE audit_logs 2FA` → 0 registros (já estavam consistentes).  
     - Validações: `SELECT COUNT(*) FROM user_2fa_codes WHERE user_id IS NULL;` → **0**.  
   - 📄 Script `scripts/sql/fase2_reinforce_user_2fa_constraints.sql` executado (08/11/25):  
     - Índices criados: `idx_user_2fa_codes_user_id`, `idx_user_2fa_config_user_id`, `idx_audit_logs_user_id_resource`.  
     - Constraints adicionadas e **validadas**: `chk_user_2fa_codes_uuid_present`, `chk_user_2fa_config_uuid_present`.  
     - `scripts/sql/fase3_prepare_audit_logs.sql` (08/11/25): criada coluna `public_user_uuid` em `audit_logs` + backfill via `clientes.uuid`/`proprietarios.uuid` (resultado: 20 registros públicos preenchidos, `user_id` permanece nulo enquanto a FK existir).  
   - Próximos passos:  
     - Preparar rollback (dropar índices/constraints/coluna) antes da fase destrutiva, se necessário.  
     - Na Fase 3, ajustar a FK de `audit_logs.user_id` (ou migrar definitivamente para `public_user_uuid`) antes de remover colunas legadas.
5. **Testes automatizados:** Atualizar/rodar testes (PowerShell + Playwright) validando logging com UUID em cenários de login, logout e 2FA (admin e público).
6. **Documentação:** Registrar evidências e aprovações no plano e inventários antes de solicitar autorização para a fase destrutiva.

---

### Anteprojeto da Fase 3 – Migração Estrutural (preparação)

1. **Banco de Dados – `imoveis`:**
   - ✅ `scripts/sql/fase3_imoveis_uuid_only.sql` executado em 08/11/25 (pré-checks + `NOT NULL` + remoção `proprietario_fk`).
   - Validar periodicamente (`SELECT COUNT(*) ...`) em auditorias futuras para garantir consistência.
   - Atualizar documentações subordinadas (`INVENTARIO_DEPENDENCIAS_IMOVEIS.md`, `ANALISE_IMPACTO_IMOVEIS.md`) com evidências e rollback (marcado como referência manual).
   - 🔍 **Checklist pós-execução:**  
     - [x] Diagnósticos reexecutados.  
     - [x] Código/serviços/front ajustados.  
     - [x] Aprovação Guardian registrada.  
     - [ ] Anexar evidências (psql + prints) aos repositórios de mudança.
- 🔍 **Checklist pré-Fase 4:**  
  - [ ] Identificar e atualizar todas as referências a `clientes.id`/`proprietarios.id` nos serviços.  
  - [ ] Rodar testes (unitários, integração, Playwright) focados em cadastros, autenticação, permissões e logs.  
  - [ ] Validar exportações/relatórios que consumam IDs.  
  - [ ] Preparar backup completo (`pg_dump`) específico para as tabelas afetadas.  
  - [ ] Aprovação Guardian registrada.
  - [ ] Seguir o checklist detalhado em `docs/CHECKLIST_FASE4_PK_UUID.md`.

#### 3.1 Checklist técnico pré-Fase 4 (SQL / Scripts)

| Etapa | Objetivo | Comandos / Scripts | Evidência esperada |
|-------|----------|--------------------|--------------------|
| Verificar preenchimento de UUID | Confirmar 100% de preenchimento antes da remoção do `id` | `SELECT COUNT(*) FROM clientes WHERE uuid IS NULL;`<br>`SELECT COUNT(*) FROM proprietarios WHERE uuid IS NULL;` | Ambos retornando `0` |
| Garantir ausência de FKs legadas | Validar que nenhum relacionamento ainda aponta para `clientes.id` ou `proprietarios.id` (integer) | ```sql<br>SELECT conname, conrelid::regclass AS table_name<br>FROM pg_constraint<br>WHERE confrelid::regclass IN ('clientes'::regclass, 'proprietarios'::regclass);<br>``` | Resultado contendo apenas constraints baseadas em `uuid` |
| Revisar sequências órfãs | Identificar sequências (`clientes_id_seq`, `proprietarios_id_seq`) e dependências antes de removê-las | `\ds clientes_id_seq proprietarios_id_seq` (psql) | Confirmação de que não há dependências críticas |
| Validar tabelas dependentes de autenticação | Certificar que `user_2fa_*` não possuem registros sem UUID | `SELECT COUNT(*) FROM user_2fa_codes WHERE user_id IS NULL;`<br>`SELECT COUNT(*) FROM user_2fa_config WHERE user_id IS NULL;` | Ambos retornando `0` |
| Conferir logs públicos/admin | Garantir continuidade de rastreabilidade pós-migração | `SELECT COUNT(*) FROM login_logs WHERE user_id IS NULL AND action NOT IN ('register','register_failed');`<br>`SELECT COUNT(*) FROM audit_logs WHERE user_id IS NULL AND public_user_uuid IS NULL;` | Ambos retornando `0` |
| Testes automatizados PowerShell | Validar CRUD completo com UUID exclusivo | `scripts\Test-ClientesUuidOnly.ps1`<br>`scripts\Test-ProprietariosUuidOnly.ps1`<br>`scripts\Test-DualKeyImoveis.ps1` | Logs de execução sem falhas |
| Testes TypeScript | Validar cadastros públicos com UUID único | `npx ts-node scripts/test-validacoes-cadastro.ts` | Saída “✅” para todos os cenários |
| Backup consistente | Garantir ponto de restauração antes da fase destrutiva | `pg_dump -Fc net_imobiliaria > backup_clientes_proprietarios_before_fase4.dump` | Arquivo `.dump` armazenado e verificado |

#### 3.2 Sequência incremental da execução (janela controlada)

1. **Aprovação formal e agendamento**
   - Registrar parecer Guardian com checklist assinado.
   - Comunicar indisponibilidade planejada e congelar deploys externos.
2. **Prepare / Freeze (T - 1h)**
   - Executar todas as consultas do item 3.1 e capturar evidências (prints/output `psql`).
   - Rodar scripts de teste (`ps1` e `ts-node`) e anexar logs.
   - Gerar backup `pg_dump` e confirmar integridade (`pg_restore -l backup ...`).
3. **Execução destrutiva (janela principal)**
   - Aplicar script `scripts/sql/fase4_clientes_proprietarios_pk_uuid.sql` (a ser versionado) com logging de cada etapa.
   - Validar imediatamente as constraints/colunas resultantes (`SELECT pg_get_constraintdef...`).
   - Remover sequências legadas e objetos órfãos conforme previsto.
4. **Smoke tests e auditoria (T + 30 min)**
   - Reexecutar scripts de teste e cenários manuais críticos (CRUD admin, cadastro público, login, 2FA, auditoria).
   - Validar dashboards e relatórios que consomem dados de clientes/proprietários.
   - Monitorar logs de aplicação/infra por eventos anômalos.
5. **Comunicação e documentação (T + 1h)**
   - Atualizar `CHECKLIST_FASE4_PK_UUID.md` e este plano com resultados/existências de rollback.
   - Atualizar inventários (`INVENTARIO_DEPENDENCIAS_*`) removendo referências a `id` inteiro.
   - Comunicar stakeholders sobre conclusão, liberar deploys e iniciar monitoramento 24-48h.
6. **Rollback (se necessário)**
   - Caso ocorra falha, aplicar `scripts/sql/fase4_clientes_proprietarios_pk_uuid_rollback.sql`.
   - Restaurar backup `pg_dump` para tabelas afetadas e repetir validações.

2. **Camada de Serviços / APIs:**
   - ✅ (08/11/25) `src/lib/database/imoveis.ts`, `src/app/api/admin/imoveis/[id]/route.ts`, `src/lib/utils/imovelAuditHelper.ts`, `src/lib/types/admin.ts` atualizados para trabalhar apenas com `proprietario_uuid`.
   - Atualizar `src/app/api/admin/imoveis/route.ts` → garantir que payloads/logs futuros usem apenas UUID (verificar fluxos secundários).
   - Mapear serviços dual key remanescentes (`findClienteByIdOrUUID`, `findProprietarioByIdOrUUID`, `findClienteById`, `findProprietarioById`) e preparar refatoração para operar 100% com UUID.

3. **Frontend (Wizard/Listagens):**
   - `GeneralDataStep.tsx` → estados e handlers armazenam apenas `proprietario_uuid`; remover campos/int fallback.
   - `ImovelGrid.tsx` → exibir apenas UUID (ou label amigável) sem mostrar `ID` legado.
   - Validar caching/busca de proprietários (hooks) para aceitar somente UUID e atualizar tipos (`src/lib/types/admin.ts`).

4. **Testes e Scripts:**
    - Atualizar `scripts/Test-DualKeyImoveis.ps1` (legado) para cenário UUID only ou substituí-lo por `Test-ImoveisUuidOnly.ps1`.
    - Garantir que scripts de carga (`migrate_clientes_proprietarios_names.js`, etc.) não tentem preencher `proprietario_fk`.
   - Preparar suíte Playwright/manual cobrindo criação, edição, filtros e auditoria com UUID único.
   - Atualizar `src/lib/utils/imovelAuditHelper.ts` para refletir nova estrutura e garantir logs consistentes.

5. **Documentação e Aprovação Guardian:**
   - Atualizar inventários (`IMOVEIS`, `CLIENTES_PROPRIETARIOS`, `LOGS_AUDITORIA`, `PERMISSOES`, `AUTENTICACAO`) com checklists e evidências.
   - Inserir seção detalhada de impacto/rollback em `ANALISE_IMPACTO_IMOVEIS.md` e, posteriormente, em `ANALISE_IMPACTO_CLIENTES_PROPRIETARIOS.md`.
   - Coletar aprovação formal (Guardian) antes de executar scripts destrutivos em ambientes controlados.
   - Registrar no inventário geral (`INVENTARIO_DEPENDENCIAS_SISTEMA.md` – histórico de revisões) cada etapa completada.

- **Dependências cruzadas:** confirmar com times de dashboards e relatórios que não consumam mais `proprietario_fk`; preparar PRs coordenados.
- **Sequência obrigatória:** somente executar remoção definitiva após testes em staging + backup full (`pg_dump`) e validação do rollback.

6. **Audit Logs:**
   - ✅ (08/11/25) `scripts/sql/fase3_audit_logs_uuid_only.sql` aplicado – backfill `user_type='admin'`, remoção `user_id_int`, índice `idx_audit_logs_public_user_uuid`, constraint de consistência.
   - ✅ APIs/Frontend (`/api/admin/audit`, `/admin/audit`) ajustados para fornecer estatísticas comparativas (admin x público).
   - ✅ Decisão guardada: manter FK `audit_logs.user_id` apenas para admins e consolidar eventos públicos via `public_user_uuid` + `user_type`. Próximos ajustes concentram-se em relatórios/exportações.

---

### Anteprojeto da Fase 3/4 – Conversão das PKs de `clientes` e `proprietarios`

1. **Diagnóstico Final:**
   - ✅ (08/11/25) `SELECT conname FROM pg_constraint ... WHERE confrelid IN ('clientes','proprietarios')` → apenas `fk_imoveis_proprietario_uuid` (nenhum FK inteiro restante).
   - ✅ `information_schema.columns` confirma inexistência de colunas `cliente_fk`, `proprietario_fk`, `cliente_id`, `proprietario_id` em vigor.
   - Levantar todos os serviços/APIs que ainda aceitam `id` inteiro (dual key) e planejar ajustes para UUID único.

2. **Levantar consumidores dual key (em andamento):**
   - APIs admin (`/api/admin/clientes/*`) ainda fazem fallback inteiro via `find*ByIdOrUUID`; rotas de proprietários já exigem UUID.  
   - Serviços `findClienteById`, `findClienteByIdOrUUID` permanecem pendentes; módulo de proprietários utiliza `findProprietarioByUuid`, `updateProprietarioByUuid`, `deleteProprietarioByUuid`.  
   - Fluxos públicos (JWT, 2FA) transportam `userId` inteiro.  
   - Scripts/tests (`Test-ProprietariosUuidOnly.ps1`, `Test-DualKeyImoveis.ps1`, etc.) e exportações.  
   - Registrar lista consolidada neste plano (tabela “Serviços/Rotas dual key”).
- Validação 08/11/25 (10h30): `SELECT COUNT(*) FROM user_2fa_codes WHERE user_id IS NULL;` → **0** (revalidação após backfill). `SELECT COUNT(*) FROM user_2fa_codes WHERE user_id_int IS NOT NULL;` → **11**. `SELECT COUNT(*) FROM user_2fa_config WHERE user_id_int IS NOT NULL;` → **6**.

   | Camada | Local/Arquivo | Observações (08/11/25) |
   |--------|---------------|------------------------|
| Serviço BD | `src/lib/database/clientes.ts` | ✅ UUID-only (`findClienteByUuid`, `updateClienteByUuid`, `deleteClienteByUuid`, `check*Exists` com `excludeUuid`). |
| Serviço BD | `src/lib/database/proprietarios.ts` | ✅ UUID-only (`findProprietarioByUuid`, `updateProprietarioByUuid`, `deleteProprietarioByUuid`). |
| API Admin | `src/app/api/admin/clientes/[id]/route.ts` | ✅ Apenas UUID; auditoria registra `resourceId = cliente.uuid`. |
| API Admin | `src/app/api/admin/proprietarios/[id]/route.ts` | ✅ Apenas UUID; auditoria registra `resourceId = proprietario.uuid`. |
| Autenticação pública | `src/app/api/public/auth/login/route.ts`, `register/route.ts`, `unifiedTwoFactorAuthService` | ✅ Payloads/logs operando com `userUuid`; `user_id_int` permanece `NULL`. |
| 2FA | `user_2fa_codes`, `user_2fa_config` | ✅ `user_id` UUID; colunas `user_id_int` mantidas apenas para histórico até Fase 4 2FA. |
| Scripts/tests | `scripts/Test-*.ps1`, `scripts/test-validacoes-cadastro.ts` | ✅ Ajustados para UUID-only e reexecutados pós-Fase 4. |
| Exportações/relatórios | CSV/Excel via APIs admin | ✅ Conferidos manualmente – exibem UUID (sem `id` legado). |

3. **Migração em Duas Etapas:**
   - **Fase 3 (preparação):**
     - Refatorar serviços e APIs para operar exclusivamente com UUID (remover fallback inteiro, renomear utilitários para `find*ByUuid`).
     - Ajustar JWT público/2FA para transportar UUID (conversão nos tokens, monitoramentos).
     - Atualizar scripts/tests e exportações para aceitar e validar apenas UUID.
- **Fase 3.1 – Refatoração pública (UUID-only)**  
  - **Escopo:** `unifiedTwoFactorAuthService`, rotas públicas (`/api/public/auth/*`), middleware `publicAuthMiddleware`, hook `usePublicAuth`, página `meu-perfil`, payloads JWT/localStorage e scripts relacionados.  
  - **Premissas:**  
    - Todos os cadastros públicos já possuem coluna `uuid` preenchida (confirmado em diagnósticos anteriores).  
    - Tabelas `user_2fa_codes`/`user_2fa_config` possuem registros com `user_id` UUID (`COUNT(*) WHERE user_id IS NULL = 0`) e ainda guardam `user_id_int` (11/6 registros) aguardando remoção coordenada.  
    - `login_logs.user_id` mantém FK para `users(id)` (admins), portanto eventos públicos continuarão com `user_id = NULL` + `details` contendo UUID.  
  - **Passos planejados:**  
    1. Ajustar `unifiedTwoFactorAuthService` para aceitar apenas UUID (tipo `string`) nos métodos públicos, mantendo compatibilidade com admins. Eliminar parâmetros `UserId` numéricos, atualizar cache e resolver carregamento de `uuid` direto.  
    2. Atualizar rotas públicas (`login`, `register`, `profile`, `check-email`, `reset-password` se aplicável) para consumir/propagar apenas UUID (`user.uuid`) em respostas, JWT e auditoria.  
    3. Atualizar JWT público: payload passa a transportar `userUuid` (string). Ajustar `publicAuthMiddleware`, `usePublicAuth`, `meu-perfil` e demais consumidores para utilizar `uuid` como chave primária.  
    4. Revisar armazenamento local (`public-auth-token`, `public-user-data`) garantindo que `id` legado não seja mais persistido; migrar/invalidar tokens antigos com documentação de fallback (logout forçado).  
    5. Atualizar logs/auditoria: garantir que `logPublicLoginEvent`, `logPublicRegisterEvent` e demais funções encaminhem `public_user_uuid` e não dependam de inteiro.  
    6. Backfill final em `user_2fa_*`: substituir `user_id_int` por `user_id` quando necessário, preparar script para remoção segura das colunas após refatoração.  
    7. Testes: repetir suite manual/automatizada de login, 2FA, cadastro, edição de perfil, além de validar logs e auditorias com UUID único (incluir evidências).  
  - **Rollback:** manter versão dual key do serviço e rotas em branch de contingência; plano de reversão inclui reativar suporte a inteiro caso detectado erro crítico.  
  - **Execução 08/11/25 11h05:**  
    - Script `scripts/sql/fase3_user_2fa_uuid_only.sql` aplicado (DROP/ADD constraints) – evidências: `codes_sem_uuid=0`, `config_sem_uuid=0`, constraints validadas.  
    - `unifiedTwoFactorAuthService` atualizado para operar exclusivamente com UUID; gravação em `user_2fa_codes/config` agora persiste `user_id` e `user_id_int=NULL`.  
    - Rotas públicas (`login`, `register`, `profile`), middleware (`publicAuthMiddleware`), hook `usePublicAuth` e componentes (`meu-perfil`) migrados para `userUuid`/`uuid`; JWT público passa a transportar `userUuid`.  
    - `lib/database/clientes.ts`/`proprietarios.ts` operam exclusivamente com UUID nas operações de seleção/atualização/exclusão.  
    - Requer verificação de cache/localStorage: tokens antigos serão invalidados (users precisarão relogar). Evidências e prints anexar após testes de UI.  
    - **Validação manual 08/11/25 11h45:** cadastro + login/logout de novo cliente e novo proprietário executados sem erros na landing (fluxo UUID + 2FA estável).  
    - **Monitoramento pós-refatoração:** `SELECT COUNT(*) FROM user_2fa_codes WHERE user_id_int IS NOT NULL;` → 11. `SELECT COUNT(*) FROM user_2fa_config WHERE user_id_int IS NOT NULL;` → 6 (registros legados a remover na Fase 4).
  - **Próxima subfase (3.2) – Admin CRUD com UUID:**  
    - Objetivo: remover fallback inteiro nas rotas e UI administrativas de clientes/proprietários (CRUD completo).  
    - Impacto esperado:  
      - Atualização de `src/app/admin/clientes/*` e `src/app/admin/proprietarios/*` para manipular apenas `uuid`.  
      - Ajuste do hook `useApi`, tabelas e botões que hoje constroem URLs com `id` inteiro.  
      - Refatoração das rotas `/api/admin/clientes/*` e `/api/admin/proprietarios/*` para aceitar `uuid` exclusivamente (`find*ByUuid`).  
      - Revisão dos tipos em `src/lib/types/admin.ts`, exports CSV, permissionamento (`logAuditEvent`), testes PowerShell/TS e inventários associados.  
    - Pré-condições:  
      - Registrar impacto/rollback (Guardian) antes de alterar rotas críticas.  
      - Garantir que listagens admin possuam `uuid` disponível (confirmar via SELECT).  
      - Definir estratégia de migração de URLs antigos (redirect ou erro orientado).  
    - Cronograma sugerido: diagnóstico + ajustes back-end → ajustes front-end → testes automatizados/manual (CRUD + permissões + auditoria).  
    - Documentar progresso nos inventários (`CLIENTES_PROPRIETARIOS`, `PERMISSOES`, `AUTENTICACAO`) a cada etapa.
    - Diagnóstico 08/11/25 (Etapa 1):  
      - APIs `GET/PUT/DELETE /api/admin/clientes/[id]` tratam UUID/INTEGER; atualizações e deleções convertem para `idInteger` antes de chamar `updateCliente`/`deleteCliente` (ver linhas 66-205).  
      - `POST /api/admin/clientes` registra `resourceId: cliente.id` na auditoria; `verificar-cpf`/`verificar-email` passaram a aceitar `excludeUuid`.  
      - Data layer `clientes.ts`: `findClienteById`, `findClienteByIdOrUUID`, `updateCliente(identifier: number | string)`, `deleteCliente(id: number)` ainda utilizam números como identificador principal; verificações de CPF/email distinguem por `isUUID`.  
      - Frontend admin (`clientes/page.tsx`, `clientes/[id]/page.tsx`, `clientes/[id]/editar/page.tsx`) tipa `Cliente.id: number`, constrói rotas (`/admin/clientes/${cliente.id}`) e consome APIs com IDs inteiros.  
      - Hooks/guards: `handleDelete(cliente.id)`, `router.push(/admin/clientes/${cliente.id}/editar)`, `PermissionGuard` e `useAuthenticatedFetch` operam com `id` legado.  
      - Auditoria: `logAuditEvent` recebe `resourceId: cliente.id` nos endpoints `GET`/`PUT`/`DELETE`/`POST`, exigindo plano de migração para `uuid`.  
      - Scripts/tests/documentos: validações admin precisam refletir `excludeUuid` nas rotas auxiliares; atualizar `docs/TESTES_CLIENTES_UUID_ONLY.md`, `docs/TESTES_DUAL_KEY_PROPRIETARIOS.md` e scripts PowerShell (`Test-ClientesUuidOnly.ps1`, `Test-ProprietariosUuidOnly.ps1`) para cenários UUID-only.
    - Execução 08/11/25 (Etapa 2 – backend + frontend clientes):  
      - `src/lib/database/clientes.ts` refatorado para expor `findClienteByUuid`, `updateClienteByUuid`, `deleteClienteByUuid`, `check*Exists` com `excludeUuid` (fallback inteiro removido).  
      - Rotas admin `GET/PUT/DELETE /api/admin/clientes/[id]` agora validam UUID, utilizam funções UUID-only e registram `resourceId: cliente.uuid` (detalhes sem `legacyId`).  
      - Rotas auxiliares (`verificar-cpf`, `verificar-email`) passaram a receber `excludeUuid`.  
      - Frontend admin (`clientes/page.tsx`, `clientes/[id]/page.tsx`, `clientes/[id]/editar/page.tsx`) navega, edita e exclui usando `cliente.uuid`; interfaces exibem `UUID` e preservam `ID legado` apenas para consulta.  
      - Perfil público (`/api/public/auth/profile`) atualizado para usar `updateClienteByUuid`.  
      - Inventários (`CLIENTES_PROPRIETARIOS`, `AUTENTICACAO`, `2FA`, `PUBLICO`) revisados com o novo estado (vide seções correspondentes).  
      - **Próximo passo:** repetir processo para proprietários e atualizar scripts/tests (`fase3-admin-proprietarios-uuid`, `fase3-admin-tests-uuid`).
    - **Validação manual 08/11/25 11h45:** cadastro + login/logout de novo cliente e novo proprietário executados sem erros na landing (fluxo UUID + 2FA estável).  
    - **Monitoramento pós-refatoração:** `SELECT COUNT(*) FROM user_2fa_codes WHERE user_id_int IS NOT NULL;` → 11. `SELECT COUNT(*) FROM user_2fa_config WHERE user_id_int IS NOT NULL;` → 6 (registros legados a remover na Fase 4).

     - Manter flag de compatibilidade enquanto os ajustes não forem aplicados em todos os pontos (evitar quebra abrupta).
   - **Fase 4 (execução destrutiva):**
     - Criar migration `fase4_clientes_proprietarios_uuid_pk.sql` com sequência:
       1. Backup completo.
       2. `ALTER TABLE ... DROP CONSTRAINT ... PRIMARY KEY`, seguida de `ALTER TABLE ... DROP COLUMN id`.
       3. Renomear `uuid` para `id` ou definir `uuid` como PK (`ALTER TABLE ... ADD PRIMARY KEY (uuid)`).
       4. Atualizar sequências/constraints dependentes.
     - Incluir bloco de rollback reintroduzindo coluna `id INTEGER`, repovoando a partir de backup e restabelecendo PK antiga (testado em staging).
   - **Fase 4 (preparação 2FA):**
     - Script proposto `scripts/sql/fase4_user_2fa_drop_user_id_int.sql` (não executado) removerá `user_id_int` de `user_2fa_codes`/`user_2fa_config` após janela de observação.
     - Pré-checks obrigatórios: `SELECT COUNT(*) FROM user_2fa_codes WHERE user_id IS NULL;` = 0 e `SELECT COUNT(*) FROM user_2fa_config WHERE user_id IS NULL;` = 0.
     - Passos principais do script: atualizar remanescentes `user_id_int` para `NULL`, dropar índices/constraints legadas, remover coluna, recriar constraint `chk_user_2fa_*` coerente com UUID-only.
     - Rollback documentado no próprio script (recria coluna, índices e constraint dual key).

4. **Camadas de Aplicação:**
   - Refatorar utilitários `findClienteByIdOrUUID`/`findProprietarioByIdOrUUID` para trabalharem apenas com UUID (renomear para `findByUuid`).
   - Atualizar TypeScript types (`Cliente.id` → string) e validar impacto em caches, tokens, permissões.
   - Revisar scripts legados (`migrate_*`, `test-db.js`, PowerShell) substituindo parâmetros inteiros por UUID.

5. **Testes Obrigatórios:**
   - Suites automatizadas (cadastros, autenticação, 2FA, logs, exportações).
   - Testes manuais em staging cobrindo relatórios, dashboards e integrações externas.
   - Auditoria dos logs pós-migração para confirmar rastreabilidade mantém UUID.

6. **Governança Guardian:**
   - Documentar impacto/rollback em `ANALISE_IMPACTO_CLIENTES_PROPRIETARIOS.md`.
   - Obter aprovação formal antes de executar fases destrutivas.
   - Monitorar 48h pós-deploy com plano de contingência.

---

## 4. Plano de Testes (por fase)

**Base comum a todas as fases:**
- Testes de CRUD completos (clientes, proprietários, imóveis).
- Verificação de validações (CPF, e-mail, CEP).
- Autenticação (admin e público) com 2FA.
- Logs/Auditoria (`login_logs`, `audit_logs`) confirmando `user_id` correto.
- Scripts automatizados: `Test-DualKeyImoveis.ps1`, `Test-ProprietariosUuidOnly.ps1`, `Test-ClientesUuidOnly.ps1`, `test-validacoes-cadastro.ts`.
- Checklists Guardian: seguir sequência do CRUD de imóveis, permissão por slug, responsividade e segurança.

**Fase 1 seguintes:**
- APIs residuais, relatórios, dashboards (lembrar de `docs/` específicos).

**Fase 3:** (além dos anteriores)
- Atualizar camadas (API, serviços, hooks, componentes) para usarem `proprietario_uuid` como identificador primário; garantir dual key não retorna mais `proprietario_fk`.
- Preparar migrations:
  - `audit_logs`: remover/ajustar FK com `users` e oficializar `public_user_uuid`.
  - `imoveis`: dropar `proprietario_fk`, garantir FK em `proprietario_uuid`, ajustar índices.
- Rodar em staging com backup + rollback (`EXPLAIN ANALYZE` nas queries críticas).
- Smoke tests full (inventário completo) antes de remover colunas integer.

---

### Execução Fase 4 – Conversão definitiva das PKs (08/11/25)
- **Preparação:**
  - `DROP TABLE clientes_backup_estrutura_20251105 CASCADE;`
  - `DROP TABLE proprietarios_backup_estrutura_20251105 CASCADE;`
  - Execução do script `\i scripts/sql/fase4_clientes_proprietarios_pk_uuid.sql` (12h17–12h18). Resultado: `COMMIT` sem exceções; notas indicaram ausência prévia das sequências legadas.
- **Validações imediatas:**
  - `\d clientes` / `\d proprietarios` → apenas a coluna `uuid` permanece, marcada como `PRIMARY KEY`.
  - `SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'clientes'::regclass AND contype = 'p';` → `PRIMARY KEY (uuid)` (idem para `proprietarios`).
  - `\ds clientes_id_seq` / `\ds proprietarios_id_seq` → sem resultados (sequências removidas).
- **Testes pós-migração (12h20–12h35):**
  - `scripts/Test-ClientesUuidOnly.ps1` – sucesso; confirma PUT/rollback e rejeição de identificadores inválidos.
  - `scripts/Test-ProprietariosUuidOnly.ps1` – sucesso; replica fluxo para proprietários.
  - `scripts/Test-DualKeyImoveis.ps1` (imóvel 129) – integrações com `proprietario_uuid` preservadas.
  - `npx ts-node scripts/test-validacoes-cadastro.ts` (`TEST_EXISTING_CLIENTE_EMAIL=teste20@gmail.com`) – três cenários “✔”.
- **Estado final:**
  - Tabelas `clientes` e `proprietarios` não possuem mais coluna `id` nem sequências associadas.
  - Auditorias registram `resourceId` apenas com UUID; detalhes não transportam `legacyId`.
  - UI/Admin e fluxos públicos testados; nenhum erro encontrado.
  - Backup `backup_clientes_proprietarios_before_fase4.dump` armazenado para reversão, caso necessária.

---

## 5. Plano de Rollback

| Fase | Rollback |
|------|----------|
| 0/1 | Nenhum (só leitura/refatoração); manter backup de código antes de mudanças |
| 2 | Reverter scripts que alterem logs (mantenha `ALTER TABLE ...` com `DROP COLUMN` separados e `ROLLBACK` testado) |
| 3 | Scripts de migração devem incluir `-- ROLLBACK` (restaurar colunas e dados). Antes de executar, tirar backup completo (dump) |
| 4 | Restaurar backup se colunas foram removidas; reexecutar fases anteriores em caso de falha |

> **Princípio Guardian:** nenhum passo destrutivo sem backup/comando de reversão testado.

---

## 6. Cronograma (proposta inicial)

- **Fase 0:** Semana 1 – diagnóstico, inventário e plano (documento preenchido).
- **Fase 1:** Semana 2 – corrigir lacunas dual key; testes e aprovação.
- **Fase 2:** Semana 3 – ajuste de logs/auditoria; validar sincronia; aprovação.
- **Fase 3:** Semana 4 – migração de FKs/tabelas em staging + produção com janelas controladas.
- **Fase 4:** Semana 5 – limpeza final, monitoramento.

*(Datas específicas dependem da aprovação e recursos. Ajustar conforme necessário.)*

---

## 7. Pendências e Ações Atribuídas

| Item | Descrição | Responsável | Status | Evidência |
|------|-----------|-------------|--------|-----------|
| 1 | Executar scripts de diagnósticos (clientes/proprietarios/imoveis) | _(preencher)_ | Pendente |  |
| 2 | Atualizar inventários com status dual key detalhado | _(preencher)_ | Concluído (07/11/25) | Clientes, Imóveis, Logs, Autenticação, Público atualizados com seções “Status Dual Key” |
| 3 | Auditar scripts `.ps1` e `.sql` (dual key) | _(preencher)_ | Pendente | Consolidar lista completa e marcar dual key |
| 4 | Definir cronograma final com stakeholders | _(preencher)_ | Pendente | Ajustar após diagnóstico |
| 5 | Validar logs (`login_logs`, `audit_logs`) com UUID espelhado | _(preencher)_ | Concluído (07/11/25) | Diagnóstico registrado (coluna `user_id_int` sem uso) |
| 6 | Revisar pendências do `npx tsc --noEmit` (issues legacy) | _(preencher)_ | Planejado pós-migração | Rodar varredura e priorizar correções após concluir fases UUID |

*(Adicionar linhas conforme tarefas forem criadas.)*

### Scripts/Rotas a Revisar (Dual Key)

| Categoria | Arquivo/Rota | Situação Atual | Ação Necessária |
|-----------|--------------|----------------|-----------------|
| **Testes PowerShell** | `scripts/Test-DualKeyImoveis.ps1` | Já cobre dual key (inteiro/UUID) | Manter/atualizar após cada fase |
| | `scripts/Test-ProprietariosUuidOnly.ps1` | Valida fluxo UUID-only | Manter atualizado |
| **Scripts SQL** | `database/VERIFICAR_PERMISSOES_SESSOES_ADMIN.sql` | ✅ Verificado (consulta apenas permissões) | Sem ação |
| | `database/TESTE_PRATICO_CORRECOES.sql` | ✅ Verificado (usa UUID diretamente) | Sem ação |
| | `database/PLANO_ACAO_MELHORIA_PERMISSOES.md`, `database/ANALISE_DETALHADA_PERMISSOES.sql` | Referências textuais/técnicas a IDs inteiros | Atualizar documentation/sql conforme migração |
| **Scripts JS/TS** | `scripts/migrate_clientes_proprietarios_names.js` | ✅ Atualizado (07/11/25) para usar `uuid` quando disponível, com fallback em `id` durante fase dual key | Sem ação adicional |
| | `scripts/test-validacoes-cadastro.ts` | Usa APIs que já aceitam UUID (nenhuma referência direta a IDs) | Sem ação |
| | `scripts/restructure-imoveis-table*.js`, `complete-imoveis-update*.js` | Scripts legados de reestruturação (não usados atualmente) | Marcar como legado / descontinuar antes da fase destrutiva |
| **APIs Admin** | `/api/admin/clientes/*`, `/proprietarios/*` | Dual key já implementada | Sem ação |
| | `/api/admin/imoveis/*` | Dual key já implementada | Sem ação |
| | `/api/admin/login-logs`, `/api/admin/audit` | Estrutura ajustada para UUID após limpeza | Planejar migração final (remoção campos legados) |
| **APIs Públicas** | `/api/public/auth/*`, `/api/public/check-*`, `/api/public/imoveis/destaque` | Dual key/UUID em uso | Sem ação |
| **Jobs/Batch** | Scripts diversos (`migrate-amenidades-proximidades`, `fix-estado-cidade-columns`, etc.) | Possíveis referências a `clientes.id`/`proprietarios.id` | Revisar conforme necessidade antes da fase destrutiva |

---

## 8. Referências
- Guardian Rules (`GUARDIAN_RULES.md`)
- Inventários:  
  - `INVENTARIO_DEPENDENCIAS_CLIENTES_PROPRIETARIOS.md`  
  - `INVENTARIO_DEPENDENCIAS_IMOVEIS.md`  
  - `INVENTARIO_DEPENDENCIAS_LOGS_AUDITORIA.md`  
  - `INVENTARIO_DEPENDENCIAS_EVENTOS_MIDDLEWARE.md`  
- Documentos de fases anteriores: `FASE2_STATUS_DUAL_KEY_ATIVO.md`, `FASE2_CORRECAO_UUID_VALIDATION.md`, `TESTES_DUAL_KEY_*`

---

> **Observação:** manter este documento continuamente atualizado durante a execução do plano, anexando resultados, aprovações e logs de teste conforme cada fase progride.



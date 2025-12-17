# Inventário de Dependências – Clientes e Proprietários

**Parte integrante de:** `docs/INVENTARIO_DEPENDENCIAS_SISTEMA.md`  
**Data:** 08/11/25 (atualizado em 08/11/25 após Subfase 3.2 clientes, Subfase 3.3 proprietários em andamento)

## Objetivo
- Consolidar um mapa completo das tabelas, APIs, componentes, permissões e rotinas que dependem da lógica de clientes e proprietários.
- Suportar análises de impacto obedecendo às Guardian Rules antes de qualquer alteração (especialmente migração UUID ↔ INTEGER).
- Servir como base viva para o checklist de regressão e para novos relatórios de impacto.
- Sustentar a migração definitiva das PKs (INTEGER → UUID) de `clientes` e `proprietarios`, registrando pré-requisitos, riscos e pontos de atenção por domínio.
- Dar suporte à migração definitiva das PKs (INTEGER → UUID), registrando pré-requisitos, riscos e pontos de ajuste.

## Visão Geral das Tabelas
- `clientes`: armazena cadastro público; atualmente possui colunas `id` (INTEGER legado), `uuid` (dual key introduzida na Fase 2), campos de endereço, autenticação e `two_fa_enabled` (adição de 05/11/25).
- `proprietarios`: estrutura espelhada à de clientes, com `uuid` dual key e campos 2FA.
- `imoveis`: referencia proprietários via `proprietario_fk` (INTEGER legado em remoção) e `proprietario_uuid` (dual key).
- Scripts relevantes: `database/fase2_adicionar_uuid_migration.sql`, `database/fase2_rollback.sql`, `database/add_2fa_fields_clientes_proprietarios.sql`, `database/standardize_clientes_proprietarios_fields.sql`.
- Índices críticos: `idx_clientes_uuid_unique`, `idx_clientes_email`, `idx_proprietarios_uuid_unique`, `idx_proprietarios_email`, `idx_imoveis_proprietario_uuid`.

### Status Atual / Pendências UUID
- ✅ Colunas `uuid` em `clientes` e `proprietarios` marcadas como `NOT NULL`; dados 100% populados.
- ✅ `imoveis.proprietario_uuid` sincronizado e `proprietario_fk` removido (08/11/25). Frontend/Admin e APIs utilizam apenas UUID.
- ✅ Diagnóstico 08/11/25: PK legado `id` continua integer (migração destrutiva na Fase 4); nenhum FK ativo aponta mais para `clientes.id` ou `proprietarios.id`.
- ✅ Subfase 3.2 concluída (clientes): camada de dados (`src/lib/database/clientes.ts`), APIs e páginas admin operam **exclusivamente com UUID** (`params.id` validado, `resourceId` audit log=uuid).
- ✅ Subfase 3.3 concluída (proprietários): serviços, APIs e UI administrativas espelham o comportamento dos clientes e operam apenas com UUID.
- ⚠️ Scripts `.ps1`/`.sql`: `scripts/Test-ProprietariosUuidOnly.ps1`, `scripts/Test-ClientesUuidOnly.ps1`, relatórios e automações devem permanecer alinhados ao fluxo UUID.
- ⚠️ Exportações/relatórios: confirmar se outputs referenciando proprietários exibem `uuid`.
- 📌 Plano central (`docs/PLANO_MIGRACAO_UUID_CLIENTES_PROPRIETARIOS.md`) controla checklist da Fase 3/4; atualizar status após concluir Subfase 3.3 e iniciar Fase 4 (alteração da PK).

## Camada de Acesso a Dados (`src/lib/database`)
- `clientes.ts`:
  - **Status atual:** UUID-only (`findClienteByUuid`, `updateClienteByUuid`, `deleteClienteByUuid`, `checkCPFExists(excludeUuid)`).
  - `findClientesPaginated` retorna `Cliente` com `uuid`; `id` legado exposto apenas para referência.
  - Validações (CPF/email) e senha com bcrypt mantidas.
- `proprietarios.ts`:
  - **Status atual:** UUID-only (`findProprietarioByUuid`, `updateProprietarioByUuid`, `deleteProprietarioByUuid`, `checkCPFExists(cpf, excludeUuid?)`, `checkEmailExists(email, excludeUuid?)`).
  - Helpers que consumiam `findProprietarioByIdOrUUID` (imóveis, serviços 2FA) foram atualizados para chamar as novas funções e validar UUID antes do uso.
- `imoveis.ts`:
  - Já opera com `proprietario_uuid` exclusivo; `create/update` recebem UUID.
- `src/lib/utils/idUtils.ts`:
  - Ainda disponível para identificar UUID vs. INTEGER em integrações legadas; planejar deprecação após remoção da dual key.

```42:110:src/lib/database/clientes.ts
export async function findClienteByUuid(uuid: string): Promise<Cliente | null> { ... }
export async function updateClienteByUuid(uuid: string, data: UpdateClienteData): Promise<Cliente> { ... }
export async function deleteClienteByUuid(uuid: string): Promise<void> { ... }
export async function checkCPFExists(cpf: string, excludeUuid?: string): Promise<boolean> { ... }
```

```38:120:src/lib/database/proprietarios.ts
export async function findProprietarioByUuid(uuid: string): Promise<Proprietario | null> { ... }
export async function updateProprietarioByUuid(uuid: string, data: UpdateProprietarioData): Promise<Proprietario> { ... }
export async function deleteProprietarioByUuid(uuid: string): Promise<void> { ... }
export async function checkCPFExists(cpf: string, excludeUuid?: string): Promise<boolean> { ... }
export async function checkEmailExists(email: string, excludeUuid?: string): Promise<boolean> { ... }
```

## APIs Admin (`src/app/api/admin`)
- **Clientes:**
  - `GET /api/admin/clientes`: paginação com filtros; payload inclui `uuid`.
  - `POST /api/admin/clientes`: criação; auditoria `resourceId = cliente.uuid`.
  - `GET/PUT/DELETE /api/admin/clientes/[id]`: validação `isValidUuid`; busca via `findClienteByUuid`; auditoria registra uuid.
  - `POST /api/admin/clientes/verificar-{cpf,email}`: request `{ value, excludeUuid }`.
- **Proprietários:**
  - Páginas admin (`proprietarios/page.tsx`, `[id]/page.tsx`, `[id]/editar/page.tsx`) navegam exclusivamente com `proprietario.uuid`.
  - `GET/PUT/DELETE /api/admin/proprietarios/[id]`: exigem UUID e auditam `resourceId = proprietario.uuid`.
  - `POST /api/admin/proprietarios/verificar-{cpf,email}`: recebe `{ value, excludeUuid }`.
- **Wizard/Imóveis:** `GeneralDataStep` consome `proprietario_uuid` e as listas de proprietários retornam apenas UUID.
- Hooks compartilhados (`useEstadosCidades`, `useApi`) permanecem válidos; payloads já carregam apenas `uuid`.

## Interface Admin (`src/app/admin`)
- **Clientes (refatorado):**
  - `clientes/page.tsx`: usa `cliente.uuid` como `key`, navegação `router.push(/admin/clientes/${cliente.uuid})`, exibe `UUID • ID legado`.
  - `clientes/[id]/page.tsx` / `editar/page.tsx`: params tratados como UUID, validações/exclusão com `uuid`.
- **Proprietários (próximo passo):**
  - `proprietarios/page.tsx`: ainda usa `proprietario.id` nas rotas; migrar para `uuid` e exibir `UUID / ID legado` (consistência visual).
  - `proprietarios/[id]/page.tsx`, `/editar/page.tsx`: alterar `get('/api/admin/proprietarios/${params.id}')` para esperar UUID; atualizar chamadas `verificar-{email,cpf}` com `excludeUuid`.
  - Verificar componentes compartilhados (`OwnerSelector`, `ProprietarioDetails`, etc.) para remover dependência de INTEGER.
- **Wizard/Imóveis:** `GeneralDataStep` já consome `proprietario_uuid`; revisar modais/listas de proprietários para refletir a mudança.
- Hooks compartilhados (`useEstadosCidades`, `useApi`) permanecem válidos; apenas payloads devem carregar `uuid`.

## Segurança, Permissões e Auditoria
- Todas as rotas passam pelo middleware de autenticação e validação de permissões (`src/lib/middleware/apiAuth.ts`, `permissionMiddleware.ts`).
- Front-end utiliza `PermissionGuard` com slugs de `system_features` (`clientes`, `proprietarios`) respeitando a granularidade CRUD definida nas Guardian Rules.
- Campos críticos (`password`, `email`, `two_fa_enabled`) foram reforçados pelo script `database/add_2fa_fields_clientes_proprietarios.sql`.
- Auditoria centralizada em `logAuditEvent` registra ações CRUD com `granted_by`/`assigned_by` quando aplicável.

## Scripts e Testes Relacionados
- `scripts/Test-ProprietariosUuidOnly.ps1`, `scripts/Test-ClientesUuidOnly.ps1`, e `scripts/Test-DualKeyImoveis.ps1`: validam, respectivamente, os fluxos UUID de proprietários, clientes e o vínculo `imoveis → proprietario_uuid`.
- Documentação de testes: `docs/TESTES_DUAL_KEY_CLIENTES.md`, `docs/TESTES_DUAL_KEY_PROPRIETARIOS.md`, `docs/TESTES_DUAL_KEY_IMOVEIS.md`, `docs/TESTES_FINAIS_COMPLETOS_FASE2.md` (checklists obrigatórios antes de qualquer mudança nos identificadores).
- Scripts SQL de verificação rápida: `database/verificar_rapido.sql`, `database/TESTE_PRATICO_CORRECOES.sql`, `database/VERIFICAR_CRUD_COMPLETO.sql` (devem ser executados após mudanças estruturais).

## Dependências Cruzadas Relevantes
- Imóveis ↔ Proprietários: criação/edição de imóveis depende dos identificadores dual key (risco de desincronizar `proprietario_fk`/`proprietario_uuid`).
- Logs e auditoria: alterações em clientes/proprietários refletem em relatórios (`src/app/admin/audit/page.tsx`, `src/app/admin/login-logs/*`).
- Segurança pública: hooks `src/hooks/usePublicAuth.ts`, `src/services/unifiedTwoFactorAuthService.ts` e scripts 2FA dependem da integridade dos campos adicionados aos cadastros.
- Permissões: `src/lib/database/userPermissions.ts`, `src/lib/permissions/PermissionValidator.ts` contém slugs `clientes` e `proprietarios`; qualquer mudança exige sincronização com `system_features`.

## Riscos Principais ao Alterar Identificadores
- Quebra de rotas que aceitam UUID (URLs, hooks de formulário, scripts automatizados).
- Desalinhamento entre `imoveis.proprietario_fk` e `imoveis.proprietario_uuid`, gerando inconsistência nos relacionamentos e nas validações do wizard de imóveis.
- Invalidação de testes/documentação existentes (todos dependem da dual key ativa).
- Impacto em auditoria/logs (IDs usados em `logAuditEvent` e relatórios).
- Interferência com 2FA e autenticação pública (campos `email`, `password`, `two_fa_enabled`).
- Qualquer mudança exige atualização simultânea de scripts de verificação, docs de testes e matriz de permissões.

## Procedimentos Obrigatórios Antes de Alterar a Lógica
1. Preencher `ANALISE_IMPACTO_CLIENTES_PROPRIETARIOS.md` (ou equivalente) listando todas as dependências acima.
2. Avaliar execução ou reversão dos scripts `fase2_adicionar_uuid_migration.sql` e `fase2_rollback.sql`, sempre com backup prévio.
3. Atualizar este inventário caso novas dependências surjam (ex.: novos componentes, APIs ou scripts).
4. Rodar os testes/scrits automatizados listados, além dos checklists em `docs/TESTES_DUAL_KEY_*`.
5. Validar permissões nos ambientes admin (Create/Update/Delete) e público (2FA) após qualquer alteração.
6. Registrar auditoria das mudanças e anexar evidências (logs de execução, prints, relatórios).

## Plano de Manutenção do Inventário
- Atualizar o documento sempre que uma nova funcionalidade tocar as tabelas de clientes ou proprietários.
- Incluir novos caminhos de código (frontend, backend ou scripts) assim que surgirem.
- Vincular este inventário no checklist Guardian para garantir consulta obrigatória durante as análises de impacto.
- Revisar trimestralmente junto aos relatórios de segurança e auditoria para manter consistência com o sistema de permissões.

---

**Responsável pela atualização:** (preencher ao finalizar a alteração)



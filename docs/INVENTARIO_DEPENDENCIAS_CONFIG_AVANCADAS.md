# Inventário de Dependências – Configurações Avançadas (Status, Tipos, Perfis, Clones)

**Versão:** 0.1  
**Data:** 07/11/25  
**Relacionado a:** `docs/INVENTARIO_DEPENDENCIAS_SISTEMA.md`

## 1. Visão Geral do Domínio
- **Escopo:** módulos administrativos de configuração que alimentam fluxos centrais (imóveis, permissões, menus), incluindo status de imóvel, tipos/finalidades, perfis/roles, clonagem de perfis e associação de usuários.
- **Objetivo:** manter cadastros de apoio reutilizáveis, com segurança (RBAC), auditoria e consistência, conforme Guardian Rules (sem hardcoding, CRUD completo, logs).
- **Componentes-chave:** páginas `src/app/admin/status-imovel/*`, `tipos-imoveis/*`, `finalidades/*`, `perfis`, `roles`, APIs correspondentes, componentes de gestão e scripts SQL.

## 2. Banco de Dados e Migrações
- **Tabelas:**
  - `status_imovel`, `tipos_imovel`, `finalidades_imovel` – catálogos com colunas `nome`, `descricao`, `is_active`, `color`, etc.
  - `user_roles`, `role_permissions`, `user_role_assignments` – perfis e permissões (ver inventário de RBAC).
  - `system_features` (referências para menu/configuração).
- **Scripts relevantes:**
  - `database/create_sidebar_tables.sql`, `database/populate_sidebar_menu.sql` (incluem features de configuração).
  - `database/associate_sidebar_items_to_features.sql`, `database/PLANO_COMPLETO_ORGANIZACAO_PERMISSOES.md`.
  - `database/TESTE_API_CATEGORIAS.sql`, `database/TESTE_INTERFACE_ATUALIZADA.sql` (validam catálogos).
- **Constraints:** FKs em imóveis (`status_fk`, `tipo_fk`, `finalidade_fk`), índices para ordenação (`order`, `nome`).

## 3. APIs e Serviços
- **Status de Imóvel (`src/app/api/admin/status-imovel`):**
  - `GET /api/admin/status-imovel` – lista com filtros; suporta `is_active`.
  - `POST /api/admin/status-imovel` – cria status (campos obrigatórios: nome, cor, ordem, visibilidade).
  - `GET/PUT/DELETE /api/admin/status-imovel/[id]` – consulta/edição/exclusão (com `PermissionGuard`).
- **Tipos/Finalidades (`/api/admin/tipos-imoveis`, `/api/admin/finalidades`):** endpoints CRUD simplificados, integrados ao wizard e filtros.
- **Perfis/Roles (`/api/admin/perfis`, `/api/admin/roles`):**
  - Listagem, criação, edição e exclusão de perfis.
  - Sub-rotas: `clone`, `bulk-permissions`, `permissions`, `users`, `toggle-2fa`, `toggle-active`.
- **Serviços de apoio:** `src/lib/database` contém funções específicas (ex.: `findStatusImoveis`, `createStatusImovel`, `updateRole`, etc.).

```1:120:src/app/api/admin/status-imovel/route.ts
const result = await pool.query('SELECT * FROM status_imovel WHERE ...')
...
await pool.query('INSERT INTO status_imovel (...) VALUES (...) RETURNING *')
```

```1:200:src/app/api/admin/roles/[id]/clone/route.ts
const role = await getRoleById(roleId)
const newRole = await cloneRole(roleId, data)
```

## 4. Frontend / UX
- **Listagens e formulários:**
  - `status-imovel/page.tsx`, `novo`, `[id]/editar`
  - `tipos-imoveis` e `finalidades` com layout semelhante (formulários usando componentes reutilizáveis, validador de campos, modais de confirmação).
- **Perfis/roles:**
  - `perfis/page.tsx`, `roles/page.tsx` com componentes `CreateRoleModal`, `EditRoleModal`, `RolePermissionsModal`, `BulkPermissionsModal`, `CloneRoleModal`, `ManagePerfilUsersModal`, `RoleHierarchyVisualization`.
  - Suporte a drag-and-drop para permissões, toggles de status/2FA, associação de usuários.
- **UX Guidelines:** validações em todos os campos (nome obrigatório, slug único), feedback auditável, uso de `PermissionGuard` em botões (criar/editar/excluir/clonar), estados de loading/erro consistentes.

## 5. Segurança e Permissões
- **Slugs:** `status-imovel`, `tipos-imoveis`, `finalidades`, `perfis`, `roles` – cada um com níveis CRUD conforme Guardian Rules.
- **Middleware:** rotas protegidas por `unifiedPermissionMiddleware`, `PermissionGuard` nos componentes.
- **Auditoria:** operações relevantes chamam `logAuditEvent` com `resource` e `resourceId` (ex.: clones, updates de status).
- **2FA / RBAC:** `toggle-2fa` integra com serviço de 2FA; manipular perfis/roles exige nível alto (`ADMIN`).

## 6. Performance e Observabilidade
- Catálogos pequenos – consultas leves; garantir paginação/sorting quando lista crescer.
- Monitorar logs de auditoria para clones/bulk updates (risco de alterações massivas).
- `BulkPermissions` pode executar muitas queries; otimizar com transações e índices adequados.

## 7. Boas Práticas DRY / Reutilização
- Reutilizar componentes modais e hooks (`useAuthenticatedFetch`) para formular dados.
- Centralizar lógica de validação/conversão no backend (evitar duplicação front/back).
- Sincronizar nomes/descrições com `system_features` para consistência de menu.
- Scripts de seed/populate devem manter catálogos atualizados; mudanças manuais exigem atualização em scripts correspondentes.

## 8. Testes e Checklists Obrigatórios
- **Documentos:** `docs/RELATORIO_CORRECAO_DEFINITIVA_CATEGORIAS.md`, `docs/RELATORIO_ELIMINACAO_WRITE.md`, `docs/TESTES_DUAL_KEY_IMOVEIS_AUTOMATIZADO.md` (garante impacto em imóveis), `docs/TESTES_DUAL_KEY_PROPRIETARIOS.md`.
- **Scripts SQL:** `database/TESTE_API_CATEGORIAS.sql`, `database/PLANO_ACAO_MELHORIA_PERMISSOES.md`, `database/VALIDACAO_FINAL_REMOCAO.sql` (verifica integridade antes/after).
- **Guardian Checklist:** validar criação/edição/exclusão, clonagem de perfis, associação de usuários, propagação de permissão para menu, reconstrução do wizard após alterações.

## 9. Dependências Cruzadas
- **Imóveis:** dependem de status/tipos/finalidades; mudanças impactam filtros, dashboards e wizard.
- **Permissões/Sidebar:** perfis e roles refletem em `role_permissions`, `system_features` e menu dinâmico.
- **Dashboards:** uso dos catálogos em gráficos (ex.: distribuição por status, tipo, finalidade).
- **2FA:** toggle em roles/perfis afeta `user_2fa_config` (ver inventário de 2FA).
- **Logs & Auditoria:** operações registradas em `audit_logs` e exibidas nos relatórios.

## 10. Riscos e Mitigações
- **Inconsistência de catálogos:** alterar/remoção sem atualizar imóveis gera FKs inválidas → aplicar scripts de validação antes/depois.
- **Clonagem incorreta:** clones devem copiar permissões sem duplicar `granted_by`; revisar logs e testar.
- **Bulk updates:** risco de conceder permissões indevidas; exigir confirmação e log.
- **Falta de rollback:** manter scripts com `ROLLBACK` e backups antes de purgas.
- **Hardcoding:** evitar valores fixos de status/tipos; sempre consumir catálogos via API/hook.

## 11. Plano de Atualização Contínua
1. Atualizar o inventário ao adicionar novos catálogos ou campos críticos.
2. Referenciar em `ANALISE_IMPACTO_CONFIG.md` para qualquer mudança nos cadastros de apoio.
3. Revisão trimestral dos catálogos (status/tipos/finalidades) para garantir aderência ao negócio.
4. Planejar migração completa para componentes compartilhados (ex.: formulários) para reduzir duplicação.

---

**Responsável pela atualização:** _(preencher)_



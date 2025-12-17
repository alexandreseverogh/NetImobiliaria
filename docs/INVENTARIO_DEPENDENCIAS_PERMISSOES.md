# Inventário de Dependências – Permissões e RBAC

**Versão:** 0.2  
**Data:** 08/11/25  
**Relacionado a:** `docs/INVENTARIO_DEPENDENCIAS_SISTEMA.md`

## 1. Visão Geral do Domínio
- **Escopo:** sistema de controle de acesso baseado em funções (RBAC), níveis granulares de permissão (READ → ADMIN), associação entre `system_features`, `permissions`, `role_permissions`, `user_role_assignments` e guardas de interface.
- **Objetivo:** garantir autorização consistente em todas as camadas (DB → API → middleware → frontend) sem hardcoding, seguindo Guardian Rules e mantendo auditoria completa.
- **Componentes-chave:** tabelas de permissões, migradores/seeders, APIs de perfis e funcionalidades, `PermissionChecker`, `PermissionGuard`, middleware unificado.

## 2. Banco de Dados e Migrações
- **Tabelas principais:**
  - `system_features` (coluna `Crud_Execute`, `slug`, categorias)
  - `permissions` (actions `read`, `create`, `update`, `delete`, `execute`, `admin`)
  - `role_permissions` (associa permissões a perfis)
  - `user_roles`, `user_role_assignments`
  - Tabelas auxiliares: `system_categorias`, `route_permissions_config`
- **Migrações/Scripts relevantes:**
  - `database/migrations/008_corrigir_permissions.sql` (recria permissões conforme `Crud_Execute`)
  - `database/migrations/015_fix_write_in_routes_v2.sql` (elimina nível WRITE)
  - `database/CORRECAO_PERMISSOES.sql`, `AJUSTE_FINAL_PERMISSOES.sql`, `ANALISE_DETALHADA_PERMISSOES.sql`, `PLANO_ACAO_MELHORIA_PERMISSOES.md` (auditorias e correções)
  - `database/VERIFICAR_CRUD_COMPLETO.sql`, `RESUMO_ESTATISTICO.sql` (relatórios de integridade)
- **Regras Guardian:** `Crud_Execute = 'CRUD'` → 4 permissões (`create/read/update/delete`), `Crud_Execute = 'EXECUTE'` → 1 permissão (`execute`). Nenhum WRITE permitido.

### Status Dual Key / Pendências UUID
- ✅ Middleware `UnifiedPermissionMiddleware` e `PermissionChecker` tratam `decoded.userId` como string UUID (nenhum `parseInt` identificado).
- ✅ Scripts de auditoria atuais (`VERIFICAR_PERMISSOES_SESSOES_ADMIN.sql`, `ANALISE_DETALHADA_PERMISSOES.sql`) dependem de `users.id` (UUID) por meio de joins.
- ✅ Diagnóstico 08/11/25: consultas `pg_constraint` confirmam inexistência de FKs ligadas a `clientes.id` ou `proprietarios.id`; RBAC opera exclusivamente com UUID.
- ⚠️ Documentos SQL legados (`PLANO_ACAO_MELHORIA_PERMISSOES.md`) ainda citam IDs inteiros em exemplos; atualizar conforme Fase 2 para evitar ambiguidades.
- 📌 Revisar rotas/admin pages que exibem usuário por ID (ex.: relatórios de permissões) para garantir que aceitam/filter UUID.

## 3. APIs e Middleware
- **APIs de manutenção:**
  - `src/app/api/admin/system-features/route.ts` & `[id]/route.ts` → CRUD de funcionalidades, atualiza permissões automaticamente.
  - `src/app/api/admin/roles/route.ts` & `[id]/route.ts` → CRUD de perfis, clonagem, bulk permissions, associação via `role_permissions`.
  - `src/app/api/admin/roles/[id]/permissions/route.ts` → gerenciamento granular de permissões por perfil.
  - `src/app/api/admin/fix-permissions/route.ts`, `setup-categories-permissions/route.ts` → rotas de correção para manter consistência.
- **Middleware:**
  - `UnifiedPermissionMiddleware` usa `route_permissions_config` para mapear rota → slug → ação padrão, delega a `PermissionChecker` e integra com 2FA.
- **Monitoramento:** logs de acesso negado são centralizados (`PermissionChecker` e middleware) para auditoria.

```91:193:src/lib/middleware/UnifiedPermissionMiddleware.ts
const hasPermission = await checkUserPermission(
  decoded.userId,
  routeConfig.feature_slug,
  routeConfig.default_action
)
```

## 4. Frontend / UX
- **Guards:** `PermissionGuard` (`CreateGuard`, `UpdateGuard`, `DeleteGuard`, etc.) aplica slugs de `system_features` para condicionar botões/ações.
- **Hooks/Contextos:** `usePermissions.ts`, `useSidebarMenu.ts`, `useSidebarItems.ts` carregam mapa de permissões do usuário e configuram menu dinâmico.
- **Interface Admin:** páginas de perfis (`/admin/perfis`, `/admin/roles`) oferecem UI para visualização e edição de permissões com hierarquia de categorias.
- **Princípios UX:** nunca exibir ação sem guard correspondente; responsividade e consistência com design system.

```1:120:src/lib/permissions/PermissionChecker.ts
const ACTION_HIERARCHY: Record<string, string[]> = {
  'READ': ['read', 'list'],
  'EXECUTE': ['execute'],
  'CREATE': ['create', 'read', 'list'],
  ...
}
```

## 5. Segurança e Auditoria
- **Hierarquia de permissão:** `ADMIN ≥ DELETE ≥ UPDATE ≥ CREATE ≥ EXECUTE ≥ READ`; `Super Admin` tem bypass total.
- **Auditoria:** alterações em perfis/permissões devem registrar `granted_by`/`assigned_by`; logs em `audit_logs` e `login_logs` (para tentativas negadas).
- **Integração 2FA:** middleware exige 2FA para rotas configuradas com `requires_2fa`.
- **Fail-safe:** `PermissionChecker` retorna false em erro (nega acesso).

## 6. Performance e Observabilidade
- Queries otimizadas com índices em `role_permissions`, `permissions`, `system_features`.
- `RouteConfigCache` (TTL 5 min) reduz hits no banco para configurações de rota.
- Scripts SQL de auditoria devem ser executados regularmente para evitar regressões.

## 7. Boas Práticas DRY / Reutilização
- Centralizar toda verificação via `PermissionChecker` (backend) e `PermissionGuard` (frontend).
- Usar slugs de `system_features` — nenhum hardcode de permissões em código.
- Rotas e componentes novos devem exigir definição prévia em `system_features` e `permissions`; sem isso, não podem ser deployados.
- Nunca duplicar lógica de permissão nas páginas; sempre consumir APIs/middleware.

## 8. Testes e Checklists Obrigatórios
- **Automatizados:** `src/lib/permissions/__tests__/PermissionChecker.test.ts` (verificação de hierarquia). Scripts `database/VERIFICAR_CRUD_COMPLETO.sql`, `ANALISE_DETALHADA_PERMISSOES.sql`.
- **Manuais:** checklists em `docs/PLANO_ACAO_MELHORIA_PERMISSOES.md`, `docs/RELATORIO_CORRECAO_LISTA_CATEGORIAS.md`, `docs/TESTES_DUAL_KEY_IMOVEIS_AUTOMATIZADO.md` (garante permissões em cascata).
- **Guardian Checklist:** confirmar que novas rotas possuem entry em `route_permissions_config` e `system_features`, e que guards foram aplicados.

## 9. Dependências Cruzadas
- **Autenticação:** token JWT inclui mapa de permissões → dependência direta da construção em `auth/login`.
- **Sidebar dinâmica:** montagem do menu depende das permissões vigentes (`useSidebarMenu.ts`).
- **Auditoria & Segurança:** dashboards de login / auditoria utilizam dados de permissões para relatórios.
- **Clientes/Proprietários/Imóveis:** CRUDs são protegidos por slugs específicos; mudança em permissões pode bloquear fluxos.

## 10. Riscos e Mitigações
- **Inconsistência de permissões:** se `Crud_Execute` não estiver alinhado, usuários podem ganhar ou perder acesso indevido → rodar scripts de auditoria antes e depois de alterações.
- **Hardcoding acidental:** evita-se com revisão de código e uso obrigatório de slugs.
- **Cache desatualizado:** sempre limpar `RouteConfigCache` ao alterar `route_permissions_config`.
- **Migrações parciais:** toda alteração em permissões deve incluir rollback documentado e plano de testes completo.
- **Dependência de IDs legados:** garantir que relatórios/testes de permissões recebam UUID (após Fase 3 do plano).

## 11. Plano de Atualização Contínua
1. Atualizar este inventário sempre que novos slugs, permissões ou perfis forem criados.
2. Vincular nas análises de impacto (`ANALISE_IMPACTO_PERMISSOES.md`) com checklist de scripts executados.
3. Revisão mensal das tabelas críticas (`system_features`, `permissions`, `role_permissions`) com os scripts de auditoria.
4. Planejar remoção final de artefatos legados (`PermissionValidator` antigo, níveis WRITE) conforme fases futuras.

---

**Responsável pela atualização:** _(preencher)_



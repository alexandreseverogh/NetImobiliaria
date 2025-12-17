# Inventário de Dependências – Eventos & Middleware Unificado

**Versão:** 0.1  
**Data:** 07/11/25  
**Relacionado a:** `docs/INVENTARIO_DEPENDENCIAS_SISTEMA.md`

## 1. Visão Geral do Domínio
- **Escopo:** infraestrutura transversal que orquestra permissões, autenticação e atualizações reativas, incluindo o middleware unificado de permissões, gerenciadores de eventos (ex.: sidebar) e serviços complementares de segurança.
- **Objetivo:** garantir controle centralizado de acesso (Guardian Rules: zero hardcoding, fail-safe), atualização dinâmica do front e integração com logs/auditoria.
- **Componentes-chave:** `src/lib/middleware/UnifiedPermissionMiddleware.ts`, `PermissionChecker`, `sidebarEventManager`, `securityMonitor`, integração com autenticação (JWT/2FA) e RBAC.

## 2. Middleware Unificado de Permissões
- **Arquivo principal:** `src/lib/middleware/UnifiedPermissionMiddleware.ts`
  - Fluxo: extrai rota/método → busca configuração (`route_permissions_config` via cache) → verifica autenticação (token JWT) → checa permissão (`PermissionChecker`) → exige 2FA se necessário → responde (permitir/403/401/500).
  - Cache: `RouteConfigCache` (TTL 5 minutos) armazena configuração por `pathname:method`, com invalidation via `clearRouteCache()`.
  - Query central: une `route_permissions_config` + `system_features` para descobrir `feature_slug`, `default_action`, `requires_auth`, `requires_2fa`.
  - Permissões delegadas a `PermissionChecker` (hierarquia granular READ → ADMIN).
  - Fail-safe: qualquer erro gera negação com `500` e log.
- **Deprécio:** arquivos antigos (`apiAuth.ts`, `permissionMiddleware.ts`) apontam para o middleware unificado e serão removidos em fase futura.

```91:190:src/lib/middleware/UnifiedPermissionMiddleware.ts
const routeConfig = await getRouteConfig(pathname, method)
const token = extractToken(request)
const hasPermission = await checkUserPermission(decoded.userId, routeConfig.feature_slug, routeConfig.default_action)
```

## 3. Configuração de Rotas
- **Tabela:** `route_permissions_config` – define `route_pattern`, `method`, `feature_id`, `default_action`, `requires_auth`, `requires_2fa`.
- **Scripts:** `database/create_sidebar_tables.sql`, `database/associate_sidebar_items_to_features.sql`, `database/PLANO_COMPLETO_ORGANIZACAO_PERMISSOES.md` (documenta setup das permissões por rota).
- **Cache invalidation:** qualquer alteração em `route_permissions_config` ou `system_features` deve limpar cache via `clearRouteCache()` (utilizar em scripts de deploy ou rotas administrativas).
- **Documentação:** `docs/PLANO_REFATORACAO_PERMISSOES_MIDDLEWARE.md` detalha fases de migração para middleware único.

## 4. PermissionChecker & Tipos
- **Arquivo:** `src/lib/permissions/PermissionChecker.ts`
  - Funções: `checkUserPermission`, `getUserPermissionsMap`, `hasPermissionSync`, `getUserWithPermissions`.
  - Hierarquia (6 níveis): READ, EXECUTE, CREATE, UPDATE, DELETE, ADMIN (WRITE mapeado para UPDATE por retrocompatibilidade temporária).
  - Consulta: `user_role_assignments` → `role_permissions` → `permissions` → `system_features`.
  - DB fail-safe: erro retorna false e log (negando acesso).
- **Tipos:** `src/lib/permissions/PermissionTypes.ts` – garante type safety em TS.
- **Export consolidado:** `src/lib/permissions/index.ts` facilita import do middleware e helpers.
- **Testes:** `src/lib/permissions/__tests__/PermissionChecker.test.ts` cobre checkers (deve ser atualizado conforme mudanças).

## 5. Eventos Reativos (Sidebar)
- **Gerenciador:** `src/lib/events/sidebarEvents.ts`
  - `sidebarEventManager.subscribe(callback)` + `notify()` – usado por `useSidebarMenu` para recarregar menu após alterações.
- **Hook:** `src/hooks/useSidebarMenu.ts`
  - Busca menu via `/api/admin/sidebar/menu`, reconstrói hierarquia e se inscreve no event manager para reload.
- **Integração:** componentes de gestão (`SidebarManagement/MenuTreeManager.tsx`, `MenuEditModal`, etc.) chamam `sidebarEventManager.notify()` após CRUD.
- **Middleware:** API `/api/admin/sidebar/menu` usa `verifyTokenNode` e funções SQL (`get_sidebar_menu_for_user`).
- **Riscos:** esquecer de emitir evento após update → menu desatualizado; garantir `notify()` em todas rotas de manutenção.

## 6. Monitoramento de Segurança
- **Serviço:** `src/lib/monitoring/securityMonitor.ts`
  - Mantém eventos de segurança (login attempts, rate limiting, inputs inválidos, atividades suspeitas).
  - Gera alertas conforme thresholds e expõe funções auxiliares (`logLoginAttempt`, `logSuspiciousActivity`).
  - Fornece dados para dashboards (`src/components/admin/logs/SecurityAlerts.tsx`).
- **Integração:** rotas de login (`/api/admin/auth/login`, `/api/public/auth/login`) registram eventos, com dependência do inventário de Logs.
- **Persistência:** combina eventos em memória com `login_logs`; funções `getDatabaseEvents`/`getDatabaseStats` consultam o banco.
- **Manutenção:** `clearOldEvents`, `resolveAlert`, `getStats` – suporte a rotinas periódicas.

## 7. Dependências Cruzadas
- **Autenticação:** middleware usa `verifyToken` para extrair userId; falha → `401` (inventário de autenticação).
- **Permissões:** rely on slugs/ações em `system_features` e `permissions` (inventário RBAC).
- **Logs:** `securityMonitor` alimenta dashboards e logs (inventário Logs & Auditoria).
- **Sidebar:** eventos controlam atualização do menu (inventário Sidebar).
- **Configurações:** alterações em rotas/perfis requerem sincronização com middleware.
- **2FA:** middleware exige 2FA para rotas configuradas; dependência direta do inventário 2FA.

## 8. Segurança e Performance
- **Fail-safe:** qualquer erro no middleware nega acesso; monitorar logs para identificar causas.
- **Cache TTL:** 5 minutos; ajustar conforme necessidade (balancear desempenho vs atualização).
- **Token sources:** aceita header `Authorization` e cookie `accessToken`; garantir consistência.
- **Eventos:** `sidebarEventManager` em memória; em escala precisa de solução cross-tab (ex.: BroadcastChannel).
- **Rate limiting:** `securityMonitor` detecta abuso; integrar com camada de rate limiting dedicada.

## 9. Testes e Checklists Obrigatórios
- **Documentos:** `docs/PLANO_REFATORACAO_PERMISSOES_MIDDLEWARE.md`, `docs/RELATORIO_CORRECAO_LISTA_CATEGORIAS.md`, `docs/RELATORIO_CORRECAO_DEFINITIVA_CATEGORIAS.md` (registro de ajustes), `docs/PROGRESSO_FASE4.md`.
- **Scripts SQL:** `database/ANALISE_DETALHADA_PERMISSOES.sql`, `database/VERIFICAR_PERMISSOES_SESSOES_ADMIN.sql` (validam rotas vs permissões).
- **Guardian Checklist:** conferir rotas novas antes do deploy (rota configurada + `system_features` + `PermissionGuard`), limpar cache, testar com usuários de diferentes perfis, validar eventos de sidebar.

## 10. Riscos e Mitigações
- **Configuração ausente:** rota sem entry → público (risco) ou 403 generalizado; revisar `route_permissions_config` antes de publicar novas features.
- **Cache desatualizado:** alterações não refletidas até expiração; chamar `clearRouteCache()` manualmente em mudanças críticas.
- **Eventos perdidos:** sem `notify()` após CRUD, sidebar exibe dados antigos; incluir testes manuais.
- **Dependência de token:** se JWT mudar formato, middleware precisa atualizar `verifyToken`/`verifyTokenNode`.
- **Migração incompleta:** referências a `PermissionMiddleware` antigo ainda existem – seguir plano de desativação em fases.

## 11. Plano de Atualização Contínua
1. Atualizar inventário sempre que middleware/eventos forem alterados ou novos managers criados.
2. Documentar em `ANALISE_IMPACTO_MIDDLEWARE.md` qualquer alteração em `route_permissions_config` ou `PermissionChecker`.
3. Revisar trimestralmente caches e thresholds do `securityMonitor`; ajustar conforme métricas reais.
4. Planejar broadcast cross-tab (ex.: Service Worker/BroadcastChannel) se múltiplas abas precisarem de update em tempo real.

---

**Responsável pela atualização:** _(preencher)_



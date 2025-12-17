# Inventário de Dependências – Sidebar Dinâmica & Configurações

**Versão:** 0.1  
**Data:** 07/11/25  
**Relacionado a:** `docs/INVENTARIO_DEPENDENCIAS_SISTEMA.md`

## 1. Visão Geral do Domínio
- **Escopo:** carregamento dinâmico da sidebar administrativa, gerenciamento visual de menus/submenus, sincronização com permissões (`system_features`) e estrutura de ícones.
- **Objetivo:** garantir que o menu reflita exatamente as permissões do usuário logado, com configuração centralizada e segura, respeitando Guardian Rules contra hardcoding.
- **Componentes-chave:** `AdminSidebar`, hooks `useSidebarMenu` / `useSidebarItems`, APIs `/api/admin/sidebar/*`, componentes de gestão (`SidebarManagement`), eventos `sidebarEventManager`.

## 2. Banco de Dados e Funções
- **Tabelas:**
  - `sidebar_menu_items` (estrutura hierárquica: `parent_id`, `order_index`, `icon_name`, `resource`, `permission_required`)
  - `system_features` (para mapear `resource`/permissões)
  - `permissions`, `role_permissions` (herdam do inventário de permissões)
- **Função crítica:** `get_sidebar_menu_for_user(uuid)` — gera menu filtrado por permissões do usuário (implementada em `database/fix_sidebar_menu_function.sql` e versões posteriores `fix_critical_security_vulnerability*.sql`).
- **Scripts relevantes:** `database/create_sidebar_tables.sql`, `database/associate_sidebar_items_to_features.sql`, `database/setup_sidebar_configuration_feature.sql`, `database/fix_sidebar_menu_function.sql`, `database/ANALISE_DETALHADA_PERMISSOES.sql` (valida consistência slug ↔ menu).
- **Campos obrigatórios:** `resource` referencia slug em `system_features`; `permission_action` deve seguir níveis (`READ`, `EXECUTE`, etc.); `order_index` controla ordenação.

## 3. APIs e Hooks
- **Rotas:**
  - `GET /api/admin/sidebar/menu` – retorna menu personalizado chamando `get_sidebar_menu_for_user`, exige token (ver `verifyTokenNode`).
  - `GET/POST/PUT/DELETE /api/admin/sidebar/menu-items` (e subrotas `[id]`) – CRUD para manutenção (utilizado pela tela de configuração). 
- **Hooks:**
  - `useSidebarMenu` – consome `/menu`, constrói estrutura hierárquica, aplica permissão (`has_permission`).
  - `useSidebarItems` – utilizado nas telas de configuração para CRUD/drag-and-drop, integrando com APIs de menu-items.
- **Eventos:** `sidebarEventManager` notifica componentes sobre alterações (para regenerar cache).

```1:100:src/hooks/useSidebarMenu.ts
const response = await fetch('/api/admin/sidebar/menu', { headers, credentials: 'include' })
const hierarchicalMenu = buildHierarchicalMenu(data.menuItems)
```

## 4. Frontend / UX
- **AdminSidebar:** renderiza menu dinâmico, aplica `PermissionGuard` por item conforme `resource`/`permission_action`, lida com expand/collapse e responsividade (mobile/desktop).
- **SidebarManagement:** conjunto de componentes (`MenuTreeManager`, `DraggableMenuItem`, `MenuEditModal`, `MenuCreateModal`, `SidebarPreview`, `IconSelector`, etc.) para configurar menus com drag-and-drop, edição de ícones (`DynamicIcon`, `MaterialIconSelector`), ativação/desativação (`is_active`).
- **Responsividade:** mobile/desktop, pré-visualização em tempo real via `SidebarPreview`.
- **UX Guidelines:** evitar menus órfãos, manter hierarquia clara, usar ícones consistentes, exibir apenas itens com permissão (`has_permission` = true).

```75:200:src/components/admin/AdminSidebar.tsx
const { menuItems, loading, error } = useSidebarMenu()
...
return (
  <PermissionGuard resource={item.resource!} action={item.permission_action!}>
    <Link href={item.url}>...</Link>
  </PermissionGuard>
)
```

## 5. Segurança e Permissões
- **Permissão necessária:** slug `sidebar-configuracao` (ou equivalente) com nível `EXECUTE`/`UPDATE` para acessar tela de configuração; menu de visualização depende apenas do slug do item (`resource`).
- **Função `get_sidebar_menu_for_user`** garante fail-safe (nega acesso quando sem permissão), usada por `UnifiedPermissionMiddleware` indiretamente (rotas de menu-items devem ter entry em `route_permissions_config`).
- **Sem hardcoding:** nomes/URLs/ícones mantidos no banco; `DynamicIcon` converte slug → ícone.
- **Logs/Auditoria:** operações de CRUD no menu devem registrar `granted_by` ou logs customizados (ver rotas de menu-items para confirmar).
- **Eventos:** ao alterar menu, emitir evento para recarregar (`sidebarEventManager`).

## 6. Performance e Cache
- `get_sidebar_menu_for_user` executa query agregada; garantir índices em `sidebar_menu_items (parent_id, order_index, is_active)`.
- Considerar caching por usuário (ex.: TTL curto) se consultas ficarem frequentes; atualmente hook recarrega apenas em evento.
- Rotas de manutenção devem invalidar cache/eventos imediatamente.

## 7. Boas Práticas DRY / Reutilização
- Centralizar todas as representações de menu na tabela; evitar duplicar estrutura no front.
- Utilizar componentes compartilhados (`DynamicIcon`, `IconSelector`) para garantir compatibilidade de ícones.
- Reutilizar `useSidebarItems` em todas telas de edição; não criar CRUD ad-hoc.
- Atualizações de permissões (inventário de permissões) devem sincronizar `resource`/`permission_action` dos itens correspondentes.

## 8. Testes e Checklists Obrigatórios
- **Documentos:** `docs/INSTRUCOES_EXECUTAR_CONFIGURACAO_SIDEBAR.md`, `docs/PLANO_COMPLETO_ORGANIZACAO_PERMISSOES.md`, `docs/INSTRUCOES_MIGRACAO_MATERIAL_UI_ICONS.md`, `docs/TESTES_DUAL_KEY_IMOVEIS.md` (impacto de permissões).
- **Scripts:** verificar `database/verificar_configuracao_sidebar.sql`, `database/associate_sidebar_items_to_features.sql` após alterações.
- **Guardian Checklist:** confirmar que novos itens têm slug/permissão definidos, `is_active` apropriado, ícone válido e ordem correta; testar visualização com usuários de perfis diferentes.

## 9. Dependências Cruzadas
- **Permissões/RBAC:** itens referenciam `system_features`; qualquer mudança no slug/permissão precisa atualizar menu.
- **Autenticação:** hook depende de token válido; mudanças no fluxo de login impactam carregamento do menu.
- **Admin Layout:** `AdminSidebar` integrado com `AdminHeader`, `PermissionGuard`, `DynamicIcon`.
- **Eventos:** `sidebarEventManager` integrado com outras áreas (ex.: após atualizar permissões).
- **Docs/Migrações:** scripts de permissão/menus devem rodar em conjunto para manter integridade.

## 10. Riscos e Mitigações
- **Menu inconsistente:** se `get_sidebar_menu_for_user` falhar ou dados estiverem incorretos, menu desaparece → monitorar logs e rodar scripts de verificação.
- **Permissão errada:** item sem `permission_action` pode ficar exposto → revisar inventário ao adicionar novos itens.
- **Ícones inválidos:** `DynamicIcon` requer nomes válidos (Heroicons ou Material Icons) → validar via componente de seleção.
- **Drag-and-drop falho:** `MenuTreeManager` atualiza `order_index`/`parent_id`; falha pode corromper ordem → sempre testar após alterações.
- **Falta de rollback:** manter scripts de rollback (`database/rollback`) para alterações massivas no menu.

## 11. Plano de Atualização Contínua
1. Atualizar este inventário ao adicionar/alterar itens, telas de gerenciamento ou lógica de permissão.
2. Referenciar em `ANALISE_IMPACTO_SIDEBAR.md` com checklist de scripts executados.
3. Revisão mensal do menu comparando com `system_features` e permissões ativas.
4. Automatizar teste de smoke para `GET /api/admin/sidebar/menu` validando diferentes perfis.

---

**Responsável pela atualização:** _(preencher)_



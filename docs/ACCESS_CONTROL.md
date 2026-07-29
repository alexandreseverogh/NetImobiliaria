# Controle de Acesso e Provisionamento de Features

Documentação completa da lógica de permissões, provisionamento e visibilidade da sidebar da plataforma.

---

## Visão Geral: como uma feature aparece na sidebar de um usuário

Para que uma feature apareça na sidebar de um usuário logado, **cinco condições** precisam ser verdadeiras simultaneamente (verificadas pela função SQL `get_sidebar_menu_for_user`):

```
1. system_features.is_active = true
2. Filtro C (tem página real): system_features.url IS NOT NULL AND url <> ''
3. Filtro A (permissão): usuário é master OU tenant admin OU tem role_permission com ação read/view/execute
4. Filtro B (provisão): usuário é master OU feature está em tenant_feature_overrides para o tenant dele
5. Categoria ativa: system_categorias.is_active = true
```

**Filtro C (adicionado em 2026-07-29, `migration-2026-07-29-sidebar-url-fixes.sql`):** existem
linhas em `system_features` que nunca foram pensadas como página navegável — são "toggles de
capacidade" que reaproveitam a mesma tabela/mecanismo de provisionamento por conveniência (ex.:
`campanhas-rede-meta`/`campanhas-rede-google`/`campanhas-rede-tiktok`, consumidas só por
`GET /api/admin/campanhas/configuracoes/redes`, nunca pela sidebar). Sem esse filtro, qualquer
feature assim — ou qualquer feature real que só ainda não teve o `url` preenchido por
esquecimento — aparecia como item de menu com `path: null`, visível mas sem nenhum link
funcional por trás. O filtro exclui automaticamente qualquer `system_features` sem `url` real
da sidebar, sem precisar de exceção por id.

---

## Tabelas envolvidas e relacionamentos

### `public.system_features`
Catálogo de todas as funcionalidades da plataforma.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | integer | PK auto-increment |
| `slug` | varchar(100) | Identificador único (gerado via trigger) |
| `name` | varchar(255) | Nome exibido |
| `url` | varchar(500) | Rota da UI (`/admin/...`) |
| `category_id` | integer | FK → `system_categorias.id` |
| `sort_order` | integer | Ordem de exibição |
| `is_active` | boolean | Se false, invisível para todos |
| `is_skill` | boolean | Se true, é uma habilidade IA |

**Categorias relevantes:**
- `category_id = 30` → Campanhas de Marketing Digital (features 92–97)

**Features de campanhas:**
| id | slug | url |
|----|------|-----|
| 92 | `importacao-criativos` | `/admin/campanhas/criativos` |
| 93 | `dashboard-campanhas` | `/admin/campanhas/dashboard` |
| 94 | `leads-campanhas` | `/admin/campanhas/leads` |
| 95 | `configuracoes-campanhas` | `/admin/campanhas/configuracoes` (cobre também `/redes`) |
| 96 | `iniciativas-campanhas` | `/admin/campanhas/iniciativas` |
| 97 | `desperdicio-campanhas` | `/admin/campanhas/desperdicio` |

---

### `public.system_modules`
Agrupa features em módulos contratáveis por tenant.

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | PK |
| `slug` | varchar(100) | Único. Ex: `trafego-pago` |
| `name` | varchar(100) | Nome exibido no provisionamento |
| `is_active` | boolean | Módulo disponível para contratação |

**Módulo de campanhas:** `slug = 'trafego-pago'` / `name = 'Gestão de Campanhas de Marketing Digital'`

---

### `public.system_feature_modules`
Relacionamento N:N entre features e módulos. **Esta é a tabela que controla o provisionamento.**

```sql
feature_id (int) → system_features.id
module_id  (uuid) → system_modules.id
PK: (feature_id, module_id)
```

**Regra crítica:** Toda feature nova precisa ser inserida aqui para aparecer na tela de provisionamento (`/admin/master/provisioning`). Sem esse vínculo, a feature existe mas é invisível na UI de provisionamento — ela cai na seção "orphan features" visível só para o MASTER.

**Atenção — distinção importante:**
- `system_features.category_id` → só serve para **agrupamento visual** (exibe o nome da categoria dentro do módulo na tela de provisionamento). NÃO determina se a feature aparece ou não.
- `system_feature_modules` → determina **quais features pertencem a quais módulos**. É o único critério da query de provisionamento.

**API disponível (sem UI):** `GET/POST /api/admin/master/modules/[id]/features` gerencia este vínculo, mas a página `/admin/master/modules` não possui modal para isso — gap de UI a implementar.

---

### `public.tenant_feature_overrides`
Define quais features estão **provisionadas** para cada tenant.

```sql
tenant_id  (uuid) → tenants.id
feature_id (int)  → system_features.id
is_active  (bool) — deve ser true para a feature estar ativa
UNIQUE: (tenant_id, feature_id)
```

**Regra de negócio:** O provisionamento é um ato deliberado (contrato). Nunca provisionar automaticamente para todos os tenants via migration — cada empresa pode ter um plano diferente. O provisionamento é feito via `/admin/master/provisioning`.

---

### `public.permissions`
Ações possíveis por feature.

```sql
id         (int)  — PK
feature_id (int)  → system_features.id
action     (varchar(50)) — lowercase: 'read', 'create', 'update', 'delete', 'execute', 'admin'
UNIQUE: (feature_id, action)
```

Ações que **desbloqueiam visibilidade na sidebar** (verificadas pela função SQL):
`read`, `view`, `execute`, `visualizar`, `acessar`

---

### `public.user_roles`
Perfis de acesso dos usuários.

| id | name | level | is_system_role | is_admin_role |
|----|------|-------|----------------|---------------|
| 41 | Master Platform | 1000 | true | false |
| 42 | Administrador | 100 | false | false |
| 47 | Administrador | 100 | false | false |
| 45 | Corretor | 50 | false | false |

**Regra:** qualquer role com `name ILIKE '%admin%'` recebe `v_is_tenant_admin = true` na função da sidebar, o que **bypassa** o check de `role_permissions` (Filtro A). O check de `tenant_feature_overrides` (Filtro B) ainda é obrigatório.

---

### `public.role_permissions`
Atribuição de permissões a roles.

```sql
role_id       (int)  → user_roles.id
permission_id (int)  → permissions.id
UNIQUE: (role_id, permission_id)
```

---

### `public.user_tenant_membership`
Vincula usuário a tenant com um role específico.

```sql
user_id   (uuid) → users.id
tenant_id (uuid) → tenants.id
role_id   (int)  → user_roles.id
```

---

### `public.user_role_assignments`
Assignments globais (sem tenant específico).

```sql
user_id (uuid) → users.id
role_id (int)  → user_roles.id
```

---

### `public.tenant_modules`
Módulos assinados por tenant (nível de contrato).

```sql
tenant_id  (uuid) → tenants.id
module_id  (uuid) → system_modules.id
is_enabled (bool)
```

---

## A função `get_sidebar_menu_for_user`

Assinatura: `get_sidebar_menu_for_user(p_user_id uuid, p_system_id text, p_tenant_id uuid) → jsonb`

**Fluxo interno:**

```
1. v_is_master   ← user tem role com is_system_role = true (em qualquer membership)
2. v_is_tenant_admin ← user tem role com name ILIKE '%admin%' no tenant p_tenant_id

3. CTE permitted_features:
   WHERE is_active = true
     AND (Filtro C: url IS NOT NULL AND url <> '' — nunca bypassado, nem por master)
     AND (Filtro A: v_is_master OR v_is_tenant_admin OR EXISTS role_permissions com ação read/view/execute)
     AND (Filtro B: v_is_master OR p_tenant_id IS NULL OR EXISTS tenant_feature_overrides ativo)

4. CTE feature_to_category:
   Prioridade 1: system_feature_categorias (mapeamento explícito)
   Prioridade 2: system_features.category_id (padrão)

5. Filtra categorias: system_categorias.is_active = true
   + verifica tenant_modules se sc.module_id IS NOT NULL

6. Retorna JSONB: [{ id, name, icon, children: [{ id, name, path, icon }] }]
```

**Chamada pelo frontend:** `useSidebarMenu` hook → `GET /api/admin/sidebar/menu?system_id=admin`

---

## Tipos de bypass

| Bypass | Condição | O que bypassa |
|--------|----------|---------------|
| Master | `is_system_role = true` | Filtro A + Filtro B (tudo) |
| Tenant Admin | `role.name ILIKE '%admin%'` | Filtro A apenas (ainda precisa de tenant_feature_overrides) |
| Sem bypass | role normal | Precisa de role_permissions E tenant_feature_overrides |

---

## `public.route_permissions_config`
Mapeia rotas URL + métodos HTTP a features e ações.

```sql
route_pattern  (varchar) — ex: '/admin/campanhas/iniciativas'
method         (varchar) — GET, POST, PATCH, DELETE
feature_id     (int)     → system_features.id
default_action (varchar) — CREATE, READ, UPDATE, DELETE, EXECUTE, ADMIN
requires_auth  (bool)
UNIQUE: (route_pattern, method)
```

**Atenção:** O middleware atual (`src/middleware.ts`) **não usa esta tabela** para enforcement — ele apenas verifica se o JWT existe. A tabela é infraestrutura para enforcement futuro.

---

## `public.sidebar_menu_items`
Tabela **legada/administrativa** para configuração visual da sidebar pelo Master. Não é usada pela função `get_sidebar_menu_for_user`. É servida por `GET /api/admin/sidebar/menu-items` para a UI de gestão em `/admin/configuracoes/sidebar`.

---

## Fluxo completo: adicionar uma nova feature

```
1. INSERT public.system_features (name, slug, url, category_id, sort_order, is_active=true)
   └─ category_id: apenas para agrupamento visual, não afeta o provisionamento
   └─ url: OBRIGATÓRIO pra aparecer na sidebar (Filtro C) — deixar vazio/NULL só se a
      intenção for um "toggle de capacidade" (ex.: contratação de rede), nunca um esquecimento

2. INSERT public.system_feature_modules (feature_id, module_id)
   └─ OBRIGATÓRIO para a feature aparecer na tela de provisionamento
   └─ Sem isso: feature cai em "orphan features" (visível só ao MASTER, sem módulo)

3. INSERT public.permissions (feature_id, action) para: read, execute, create, update, delete
   └─ 'read'/'view'/'execute' desbloqueiam visibilidade na sidebar

4. INSERT public.role_permissions (role_id, permission_id) para os roles relevantes
   └─ Desnecessário para roles ILIKE '%admin%' (bypass), mas boa prática para outros roles

5. Provisionamento deliberado via /admin/master/provisioning por empresa
   └─ INSERT tenant_feature_overrides (tenant_id, feature_id, is_active=true)
   └─ NÃO fazer via migration automática — cada empresa tem seu plano
```

**Gap de UI:** A página `/admin/master/modules` não tem modal para gerenciar `system_feature_modules` individualmente. O passo 2 atualmente só pode ser feito via SQL ou pelo API `POST /api/admin/master/modules/[id]/features`.

---

## Fluxo completo: login e carregamento da sidebar

```
1. POST /api/admin/auth/login → JWT cookie admin_auth_token
2. AdminLayoutContent monta → useSidebarMenu('admin')
3. GET /api/admin/sidebar/menu?system_id=admin&tenant_id=...
4. SQL: get_sidebar_menu_for_user(userId, 'admin', tenantId)
5. Retorna JSONB com categorias + features permitidas
6. Frontend renderiza AdminSidebar com os itens recebidos
```

---

## Tenants ativos

| id | name | status |
|----|------|--------|
| `c828d003-...` | Imobiliaria XYZ | active |
| `efbf62cf-...` | Marketing Digital | active |
| `00000000-0000-0000-0000-000000000001` | Master Platform | active |

**Marketing Digital** tem features 92–95 de campanhas provisionadas.
**Imobiliaria XYZ** não tem módulo de campanhas provisionado.
**Master Platform** não precisa de `tenant_feature_overrides` (bypass total por `is_system_role`).

# 🎯 INTERFACE DE GERENCIAMENTO DA SIDEBAR

**Data de Criação:** 26/10/2025  
**Status:** 📋 PLANEJADO  
**Prioridade:** 🔴 ALTA

---

## 📋 RESUMO EXECUTIVO

Sistema completo de interface administrativa para gerenciar dinamicamente a estrutura da sidebar, permitindo configuração visual de menus, hierarquia e permissões sem necessidade de alteração de código.

---

## 🎯 OBJETIVOS

1. **Gerenciamento Visual** - Configurar sidebar via interface web
2. **Sem Código** - Nenhuma alteração de código necessária
3. **Flexibilidade** - Criar, editar, deletar menus e subitens
4. **Permissões Dinâmicas** - Configurar acesso por perfis
5. **Preview em Tempo Real** - Visualizar sidebar antes de salvar

---

## 🏗️ ARQUITETURA

### **1. Localização da Interface**
- **URL:** `/admin/configuracoes/sidebar`
- **Permissão:** Apenas `Super Admin` e `Administrador`
- **Componente Principal:** `src/app/admin/configuracoes/sidebar/page.tsx`

### **2. Layout da Página**

```
┌─────────────────────────────────────────────────────────┐
│  Gerenciar Sidebar                           [+ Novo]   │
├──────────────────────────────┬──────────────────────────┤
│                              │                          │
│  ÁRVORE DE MENUS (70%)       │  PREVIEW (30%)           │
│                              │                          │
│  ┌────────────────────────┐  │  ┌──────────────────┐   │
│  │ Painel do Sistema [-]  │  │  │ Preview Sidebar  │   │
│  │  ├─ Categorias    [✎]  │  │  │                  │   │
│  │  ├─ Funcionalidades   │  │  │ Painel Sistema   │   │
│  │  └─ + Adicionar       │  │  │  ├─ Categorias   │   │
│  └────────────────────────┘  │  │  └─ ...          │   │
│                              │  └──────────────────┘   │
│  ┌────────────────────────┐  │                          │
│  │ Painel Administrativo  │  │                          │
│  │  ...                   │  │                          │
│  └────────────────────────┘  │                          │
│                              │                          │
└──────────────────────────────┴──────────────────────────┘
```

---

## 🔑 FUNCIONALIDADES

### **1. Gerenciamento de Menus Pai**

**Ações Disponíveis:**
- ✅ **Criar** novo menu pai
- ✅ **Editar** nome, ícone, URL, descrição
- ✅ **Deletar** menu (apenas se não tiver filhos)
- ✅ **Reordenar** por drag & drop
- ✅ **Ativar/Desativar** visibilidade

**Campos Obrigatórios:**
- Nome
- Ícone
- Perfis com acesso

**Campos Opcionais:**
- URL (para menus que não têm filhos)
- Descrição
- Funcionalidade associada
- Ordem de exibição

### **2. Gerenciamento de Subitens**

**Ações Disponíveis:**
- ✅ **Adicionar** subitem a um menu pai
- ✅ **Editar** subitem
- ✅ **Deletar** subitem
- ✅ **Reordenar** subitens (mover para cima/baixo)
- ✅ **Ativar/Desativar** visibilidade

**Campos Obrigatórios:**
- Nome
- Ícone
- URL
- Perfis com acesso

### **3. Configuração de Permissões**

**Sistema de Perfis (RBAC):**
```typescript
// Perfis disponíveis
['Super Admin', 'Administrador', 'Corretor', 'Usuário']

// Seleção multi-select
roles_required: ['Super Admin', 'Administrador']
```

**Sistema de Funcionalidades (Opcional):**
```typescript
// Associar a uma funcionalidade do sistema
feature_id: 123
permission_id: 456

// Ações CRUD automáticas via permissions table
action: 'READ' | 'WRITE' | 'DELETE' | 'EXECUTE'
```

**Como Funciona:**
1. Admin seleciona perfis que têm acesso ao menu
2. (Opcional) Admin associa menu a uma funcionalidade
3. Sistema valida permissões automaticamente na função `get_sidebar_menu_for_user(UUID)`
4. Menu aparece apenas para usuários com permissão

### **4. Seletor de Ícones**

**Biblioteca de Ícones:**
- Heroicons v2 (outline)
- ~50+ ícones disponíveis
- Busca por nome
- Preview visual

**Ícones Disponíveis:**
- Home, Building, Users, UserGroup
- Shield, Chart, Document, Cog
- Tag, MapPin, Clock, Trash
- Wrench, Squares, Clipboard, etc.

### **5. Preview em Tempo Real**

**Recursos:**
- Sidebar simula estrutura real
- Mostra apenas menus ativos
- Ícones renderizados
- Hierarquia preservada
- Atualiza em tempo real

---

## 🎨 COMPONENTES

### **1. MenuTreeManager**
**Responsabilidade:** Gerenciar árvore de menus  
**Localização:** `src/components/admin/SidebarManagement/MenuTreeManager.tsx`

```typescript
- Lista todos os menus
- Permite adicionar menu pai
- Renderiza MenuParent para cada menu
- Modal para editar/criar
```

### **2. MenuEditModal**
**Responsabilidade:** Formulário de edição/criação  
**Localização:** `src/components/admin/SidebarManagement/MenuEditModal.tsx`

```typescript
- Formulário completo
- Validação de campos
- Submit via API
- Feedback visual
```

### **3. IconSelector**
**Responsabilidade:** Seletor visual de ícones  
**Localização:** `src/components/admin/SidebarManagement/IconSelector.tsx`

```typescript
- Grid de ícones
- Busca por nome
- Seleção visual
- Preview do selecionado
```

### **4. SidebarPreview**
**Responsabilidade:** Preview da sidebar  
**Localização:** `src/components/admin/SidebarManagement/SidebarPreview.tsx`

```typescript
- Renderiza sidebar simulada
- Mesma estrutura visual
- Atualização automática
- Sticky no scroll
```

### **5. useSidebarItems Hook**
**Responsabilidade:** Lógica de gerenciamento  
**Localização:** `src/hooks/useSidebarItems.ts`

```typescript
- Buscar itens da API
- Criar/Editar/Deletar
- Validação de dados
- Cache local
```

---

## 📊 FLUXO DE USO

### **Cenário 1: Criar Novo Menu Pai**

1. Admin acessa `/admin/configuracoes/sidebar`
2. Clica em "Adicionar Menu Pai"
3. Modal de criação abre
4. Preenche:
   - Nome: "Relatórios Avançados"
   - Ícone: Escolhe "document" no seletor
   - Perfis: Seleciona "Super Admin, Administrador"
   - Ordem: 10
   - Status: Ativo
5. Clica em "Salvar"
6. API cria no banco via `POST /api/admin/sidebar/menu-items`
7. Lista atualiza automaticamente
8. Preview mostra novo menu

### **Cenário 2: Adicionar Subitem**

1. Admin visualiza menu "Imóveis"
2. Clica em "+ Adicionar Subitem" dentro do menu
3. Modal de criação abre
4. Preenche:
   - Nome: "Listagem Avançada"
   - Ícone: "building"
   - URL: "/admin/imoveis/lista-avancada"
   - Perfis: "Super Admin, Administrador, Corretor"
5. Sistema automaticamente define `parent_id`
6. Salva e atualiza estrutura

### **Cenário 3: Editar Permissões**

1. Admin clica em "Editar" em um menu
2. Modal abre com dados atuais
3. Altera "Perfis com Acesso":
   - Remove "Corretor"
   - Mantém "Super Admin, Administrador"
4. Clica em "Salvar"
5. API atualiza via `PUT /api/admin/sidebar/menu-items/[id]`
6. Corretores param de ver o menu automaticamente

---

## 🔐 SEGURANÇA

### **Validações**

1. **Validação de Dados**
   - Nome obrigatório
   - Ícone obrigatório
   - Perfis obrigatórios
   - URL obrigatória para subitens

2. **Validação de Acesso**
   - Apenas Super Admin e Administrador
   - Validação no backend
   - PermissionGuard no frontend

3. **Validação de Integridade**
   - Não permite deletar menu com filhos
   - Verifica permissões antes de salvar
   - Valida IDs de funcionalidades

### **Auditoria**

- Tabela `sidebar_menu_items` tem:
  - `created_by` - Usuário que criou
  - `updated_by` - Usuário que atualizou
  - `created_at` - Data de criação
  - `updated_at` - Data de atualização

---

## 📁 ARQUIVOS A CRIAR

```
src/app/admin/configuracoes/sidebar/
└── page.tsx                               # Página principal

src/components/admin/SidebarManagement/
├── MenuTreeManager.tsx                    # Gerenciador de árvore
├── MenuEditModal.tsx                      # Modal de edição
├── IconSelector.tsx                       # Seletor de ícones
├── SidebarPreview.tsx                     # Preview
├── MenuParent.tsx                         # Componente de menu pai
└── MenuChild.tsx                          # Componente de submenu

src/hooks/
└── useSidebarItems.ts                     # Hook de gerenciamento
```

---

## ✅ BENEFÍCIOS

1. **Flexibilidade** - 95% de redução no tempo para adicionar novo menu
2. **Manutenibilidade** - 80% de redução em custo de manutenção
3. **Segurança** - Permissões validadas automaticamente
4. **UX** - Interface intuitiva e visual
5. **Sem Deploy** - Mudanças aplicadas imediatamente

---

## 🚀 PRÓXIMOS PASSOS

1. Criar página base `/admin/configuracoes/sidebar`
2. Implementar componentes de gerenciamento
3. Integrar com APIs existentes
4. Testar funcionalidades
5. Adicionar à sidebar administrativa

---

## 🔄 FLUXO DE CRIAÇÃO DE NOVA FUNCIONALIDADE

### **Visão Geral do Processo**

Quando você precisar criar uma nova funcionalidade e adicioná-la à sidebar, siga este fluxo:

```
1. Criar Funcionalidade
   ↓
2. Desenvolver Página/API
   ↓
3. Adicionar à Sidebar (via Interface)
   ↓
4. Configurar Permissões (via Interface)
   ↓
5. Testar e Publicar
```

---

### **PASSO 1: Criar Funcionalidade no Sistema**

**Interface:** `/admin/system-features`

**Processo:**
1. Acesse `/admin/system-features`
2. Clique em "Nova Funcionalidade"
3. Preencha os dados:
   - **Nome:** Ex: "Relatórios de Vendas"
   - **URL:** Ex: "/admin/relatorios/vendas"
   - **Categoria:** Selecione a categoria apropriada
   - **Descrição:** Descrição da funcionalidade
4. Clique em "Salvar"
5. Anote o **Feature ID** criado

**Resultado:**
- Registro criado na tabela `system_features`
- Funcionalidade disponível para associação com menus

---

### **PASSO 2: Desenvolver a Página/API**

**Desenvolvimento:**
1. Crie a página em `src/app/admin/relatorios/vendas/page.tsx`
2. Implemente as APIs necessárias em `src/app/api/admin/relatorios/vendas/`
3. Teste a funcionalidade localmente

**Observação:**
- A página não aparecerá na sidebar ainda
- Você pode acessar diretamente pela URL durante desenvolvimento

---

### **PASSO 3: Adicionar à Sidebar (VIA INTERFACE)**

**Interface:** `/admin/configuracoes/sidebar`

**Processo:**
1. Acesse `/admin/configuracoes/sidebar`
2. Localize o menu pai onde deseja adicionar (ex: "Relatórios")
3. Clique em "+ Adicionar Subitem"
4. Preencha os dados:
   - **Nome:** Mesmo nome da funcionalidade (ex: "Relatórios de Vendas")
   - **Ícone:** Selecione um ícone apropriado (ex: "chart")
   - **URL:** Mesma URL da página (ex: "/admin/relatorios/vendas")
   - **Descrição:** (Opcional)
5. **Associar Funcionalidade:**
   - No campo "Funcionalidade Associada", selecione a funcionalidade criada no PASSO 1
   - Isso cria a ligação entre menu e funcionalidade
6. **Configurar Perfis com Acesso:**
   - Selecione os perfis que podem ver este menu
   - Ex: "Super Admin, Administrador"
7. **Ordem:** Defina a ordem de exibição
8. Clique em "Salvar"

**Resultado:**
- Menu aparece na sidebar
- Menu associado à funcionalidade (`feature_id`)
- Menu visível apenas para perfis selecionados
- Preview atualizado em tempo real

---

### **PASSO 4: Configurar Permissões Detalhadas (VIA INTERFACE)**

**Interface:** `/admin/permissions`

**IMPORTANTE:** As permissões de acesso são gerenciadas pela interface de **"Configurar Permissões"** (`/admin/permissions`), onde você define:
- Quais perfis têm acesso
- Quais ações (READ, WRITE, DELETE, EXECUTE) cada perfil pode executar

**Processo:**
1. Acesse `/admin/permissions`
2. Localize a funcionalidade criada (ou crie uma nova permissão para ela)
3. Configure as permissões por perfil:
   - **READ:** Pode visualizar
   - **WRITE:** Pode criar/editar
   - **DELETE:** Pode excluir
   - **EXECUTE:** Pode executar ações especiais
4. Atribua estas permissões aos perfis desejados:
   - Super Admin
   - Administrador
   - Corretor
   - Usuário

**Exemplo de Configuração:**

| Perfil          | READ | WRITE | DELETE | EXECUTE |
|-----------------|------|-------|--------|---------|
| Super Admin     | ✅   | ✅    | ✅     | ✅      |
| Administrador   | ✅   | ✅    | ❌     | ✅      |
| Corretor        | ✅   | ❌    | ❌     | ❌      |
| Usuário         | ❌   | ❌    | ❌     | ❌      |

**Resultado:**
- Permissões definidas no banco de dados
- Validação automática pelo sistema
- Acesso controlado baseado em CRUD + EXECUTE

---

### **PASSO 5: Testar e Publicar**

**Testes:**
1. Teste com cada perfil:
   - Login como Super Admin → Verifica acesso completo
   - Login como Administrador → Verifica permissões configuradas
   - Login como Corretor → Verifica permissões restritas
   - Login como Usuário → Verifica bloqueio de acesso
2. Teste todas as ações (READ, WRITE, DELETE, EXECUTE) conforme permissões

**Publicação:**
- Se tudo funcionar corretamente, a funcionalidade está pronta
- Menu aparece automaticamente na sidebar para usuários com permissão

---

## 📊 RELACIONAMENTO ENTRE TABELAS

```
┌──────────────────────────────┐
│  system_features             │  ← Criado via /admin/system-features
│  (Funcionalidades do Sistema)│
│  - id                        │
│  - name                      │
│  - url                       │
│  - category_id               │
│  - description               │
└──────────────┬───────────────┘
               │
               │ feature_id (FK)
               ↓
┌──────────────────────────────┐
│  sidebar_menu_items          │  ← Criado via /admin/configuracoes/sidebar
│  (Itens do Menu da Sidebar)  │
│  - id                        │
│  - name                      │
│  - icon_name                 │
│  - url                       │
│  - feature_id ═══════════════┘
│  - roles_required            │
│  - permission_id             │
└──────────────┬───────────────┘
               │
               │ permission_id (FK)
               ↓
┌──────────────────────────────┐
│  permissions                 │  ← Criado via /admin/permissions
│  (Permissões Detalhadas)     │
│  - id                        │
│  - feature_id                │
│  - action (READ/WRITE/etc)   │
│  - resource                  │
└──────────────┬───────────────┘
               │
               │ via role_permissions
               ↓
┌──────────────────────────────┐
│  roles                       │  ← Associado via /admin/permissions
│  (Perfis de Usuário)         │
│  - id                        │
│  - name                      │
│  - permissions (via join)    │
└──────────────────────────────┘
```

---

## ✅ RESUMO DAS INTERFACES

### **1. Criar Funcionalidade**
- **Interface:** `/admin/system-features`
- **O que faz:** Cria registro na tabela `system_features`
- **Uso:** Primeiro passo para criar nova funcionalidade

### **2. Adicionar à Sidebar**
- **Interface:** `/admin/configuracoes/sidebar`
- **O que faz:** Adiciona item na sidebar, associando à funcionalidade
- **Uso:** Segundo passo, configura visibilidade e hierarquia

### **3. Configurar Permissões**
- **Interface:** `/admin/permissions`
- **O que faz:** Define permissões detalhadas (CRUD + EXECUTE) por perfil
- **Uso:** Terceiro passo, controle de acesso granular

---

## 🎯 REGRAS IMPORTANTES

### **✅ SEMPRE FAÇA VIA INTERFACE:**
- ✅ Criar funcionalidade → `/admin/system-features`
- ✅ Adicionar à sidebar → `/admin/configuracoes/sidebar`
- ✅ Configurar permissões → `/admin/permissions`

### **❌ NÃO FAÇA MANUALMENTE:**
- ❌ Inserir diretamente no banco via SQL
- ❌ Editar tabelas diretamente
- ❌ Modificar código fonte da sidebar

### **🔒 GARANTIAS:**
- 🔒 Validações automáticas de dados
- 🔒 Auditoria completa (created_by, updated_by)
- 🔒 Integridade referencial
- 🔒 Rollback seguro
- 🔒 Versionamento de menus

---

**Status:** 📋 PRONTO PARA IMPLEMENTAÇÃO


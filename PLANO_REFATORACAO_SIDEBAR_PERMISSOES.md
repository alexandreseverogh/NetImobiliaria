# 🎯 PLANO DETALHADO: REFATORAÇÃO SIDEBAR E SISTEMA DE PERMISSÕES

**Data de Criação:** 26/10/2025  
**Autor:** AI Assistant  
**Status:** 📋 PLANEJAMENTO  
**Prioridade:** 🔴 ALTA  
**Prazo Estimado:** 5-7 dias úteis

---

## 📋 SUMÁRIO EXECUTIVO

### **Objetivo**
Eliminar todo hardcoding presente na sidebar e no sistema de permissões, tornando-o 100% gerenciável via banco de dados, com capacidade de:
- Criar/editar/excluir itens de menu dinamicamente
- Gerenciar permissões sem deploy
- Versionamento de menus
- A/B testing de funcionalidades
- Manutenção por usuários não-técnicos

### **Impacto Esperado**
- ✅ **Flexibilidade:** 95% de redução em tempo para adicionar novo menu
- ✅ **Manutenibilidade:** 80% de redução em custo de manutenção
- ✅ **Segurança:** Zero hardcoding de credenciais admin
- ✅ **Escalabilidade:** Suporte a multi-tenant e períodos de menu

---

## 🔍 DIAGNÓSTICO ATUAL

### **1. Problemas Identificados (Análise Detalhada)**

#### **1.1 Hardcoding de Validação Admin (CRÍTICO)**
**Localização:** `src/components/admin/AdminSidebar.tsx` (linhas 295-297, 381-383)

```typescript
const isAdmin = user.username === 'admin' || 
                user.email === 'admin@123' ||
                ['Administrador', 'Super Admin'].includes(user.role_name)
```

**Impactos:**
- ⚠️ **Segurança:** Credenciais expostas no código-fonte
- ⚠️ **Manutenção:** Necessita deploy para alterar admin
- ⚠️ **Auditoria:** Não rastreável no banco de dados
- ⚠️ **Duplicação:** Lógica repetida em 2 lugares

**Risco de Ruptura:** 🔴 **CRÍTICO** - Sistema pode quebrar se admin for renomeado

---

#### **1.2 Estrutura de Menu Totalmente Hardcoded**
**Localização:** `src/components/admin/AdminSidebar.tsx` (linhas 66-254)

**Todos os itens hardcoded:**
- Nomes dos menus (ex: "Painel do Sistema")
- Ícones (ex: `WrenchScrewdriverIcon`)
- URLs (ex: `/admin/system-features`)
- Roles permitidas (ex: `['Super Admin', 'Administrador']`)
- Recursos associados (ex: `'system-features'`)

**Impactos:**
- ⚠️ **Frequência:** Qualquer mudança requer deploy completo
- ⚠️ **Tempo:** 2-4 horas para adicionar 1 item simples
- ⚠️ **Erros:** Alto risco de quebra em produção
- ⚠️ **Flexibilidade:** Impossível testar A/B de menus

**Risco de Ruptura:** 🟡 **MÉDIO** - Pode quebrar se role for renomeado

---

#### **1.3 Roles Hardcoded em Múltiplos Locais**
**Localização:** Disperso em todo código

```typescript
roles: ['Super Admin', 'Administrador']
roles: ['Super Admin', 'Administrador', 'Corretor']
roles: ['Super Admin', 'Administrador', 'Corretor', 'Usuário']
```

**Impactos:**
- ⚠️ **Inconsistência:** Risco de divergência com banco
- ⚠️ **Manutenção:** Alterar role = alterar N arquivos
- ⚠️ **Propagação:** Erros se espalham rapidamente

**Risco de Ruptura:** 🟡 **MÉDIO** - Sistema pode quebrar se role for removido

---

#### **1.4 Mapeamento Manual de Features (30+ entradas)**
**Localização:** `src/lib/database/userPermissions.ts` (linhas 127-179)

```typescript
const featureMapping: { [key: string]: string } = {
  'Categorias de Funcionalidades': 'system-features',
  'Funcionalidades do Sistema': 'system-features',
  'funcionalidades do sistema': 'system-features',
  // ... 30+ entradas manuais
}
```

**Impactos:**
- ⚠️ **Fragilidade:** Diferenças sutis quebram mapeamento
- ⚠️ **Manutenção:** Cada feature nova = 1 entrada manual
- ⚠️ **Erros:** Fácil esquecer entrada

**Risco de Ruptura:** 🟠 **ALTO** - Pode quebrar com pequenas mudanças

---

#### **1.5 Ícones Hardcoded**
**Localização:** `src/components/admin/AdminSidebar.tsx` (importação de ícones)

**Impactos:**
- ⚠️ **Flexibilidade:** Limite de ícones disponíveis
- ⚠️ **Tamanho:** Bundle aumenta com todos os ícones

**Risco de Ruptura:** 🟢 **BAIXO** - Não quebra funcionalidade

---

#### **1.6 Duplicação de Lógica de Permissão**
**Localização:** `src/components/admin/AdminSidebar.tsx` (linhas 261-288 e 375-392)

**Impactos:**
- ⚠️ **DRY:** Violação de Don't Repeat Yourself
- ⚠️ **Manutenção:** Mudanças precisam ser feitas 2x
- ⚠️ **Erros:** Fácil esquecer uma das implementações

**Risco de Ruptura:** 🟡 **MÉDIO** - Pode gerar inconsistências

---

### **2. Arquivos Afetados**

```
src/components/admin/AdminSidebar.tsx          (572 linhas) - PRINCIPAL
src/lib/database/userPermissions.ts            (252 linhas) - CRÍTICO
src/app/admin/*/page.tsx                       (multi arquivos) - MÉDIO
src/app/api/admin/*/route.ts                   (multi arquivos) - MÉDIO
```

**Total Estimado:** ~15 arquivos afetados

---

## 🏗️ ARQUITETURA PROPOSTA

### **1. Estrutura de Banco de Dados**

#### **1.1 Nova Tabela: `sidebar_menu_items`**

```sql
CREATE TABLE sidebar_menu_items (
  id SERIAL PRIMARY KEY,
  parent_id INTEGER REFERENCES sidebar_menu_items(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  icon_name VARCHAR(100) NOT NULL,
  url VARCHAR(500),
  resource VARCHAR(100),
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  roles_required JSONB, -- ['Super Admin', 'Administrador']
  permission_required VARCHAR(100),
  permission_action VARCHAR(50), -- 'READ', 'WRITE', etc
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id)
);

-- Índices para performance
CREATE INDEX idx_sidebar_menu_items_parent ON sidebar_menu_items(parent_id);
CREATE INDEX idx_sidebar_menu_items_active ON sidebar_menu_items(is_active);
CREATE INDEX idx_sidebar_menu_items_order ON sidebar_menu_items(order_index);
```

#### **1.2 Nova Tabela: `sidebar_menu_versions`**

```sql
CREATE TABLE sidebar_menu_versions (
  id SERIAL PRIMARY KEY,
  version_name VARCHAR(100) NOT NULL,
  menu_structure JSONB NOT NULL, -- Snapshop completo
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by UUID REFERENCES users(id)
);
```

**Uso:** Versionamento de menus para testes A/B e rollback

---

### **2. Componentes Novos**

#### **2.1 `SidebarMenuLoader`**
**Responsabilidade:** Carregar estrutura de menu do banco

```typescript
// src/hooks/useSidebarMenu.ts
interface SidebarMenuItem {
  id: number
  parent_id: number | null
  name: string
  icon_name: string
  url: string | null
  resource: string | null
  order_index: number
  children: SidebarMenuItem[]
}

export function useSidebarMenu(user: AdminUser) {
  const [menuItems, setMenuItems] = useState<SidebarMenuItem[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadMenuFromDatabase(user)
  }, [user])
  
  return { menuItems, loading }
}
```

#### **2.2 `DynamicIconRenderer`**
**Responsabilidade:** Renderizar ícones dinamicamente

```typescript
// src/components/common/DynamicIcon.tsx
const iconMap: Record<string, React.ComponentType<any>> = {
  'home': HomeIcon,
  'building': BuildingOfficeIcon,
  'users': UsersIcon,
  // ... mapeamento de string para componente
}

export function DynamicIcon({ iconName, className }: { iconName: string, className?: string }) {
  const Icon = iconMap[iconName] || HomeIcon
  return <Icon className={className} />
}
```

#### **2.3 `PermissionValidator`**
**Responsabilidade:** Centralizar validação de permissões

```typescript
// src/lib/permissions/PermissionValidator.ts
export class PermissionValidator {
  // Centralizar TODA a lógica de validação aqui
  static isAdmin(user: AdminUser): boolean {
    // Buscar do banco de dados, nunca hardcoded
    return this.checkRole(user, 'admin-access-role')
  }
  
  static hasPermission(user: AdminUser, resource: string, action: string): boolean {
    // Lógica única e reutilizável
  }
}
```

---

### **3. API Endpoints Novos**

#### **3.1 GET `/api/admin/sidebar/menu`**
**Responsabilidade:** Retornar menu personalizado para usuário

```typescript
export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request)
  
  // Buscar menu do banco filtrado por permissões do usuário
  const menuItems = await loadSidebarMenu(user)
  
  return NextResponse.json({ menuItems })
}
```

#### **3.2 GET `/api/admin/sidebar/menu-items`**
**Responsabilidade:** Listar todos os itens (admin)

```typescript
export async function GET() {
  const items = await pool.query(`
    SELECT * FROM sidebar_menu_items 
    WHERE is_active = true 
    ORDER BY order_index
  `)
  return NextResponse.json({ items: items.rows })
}
```

#### **3.3 POST `/api/admin/sidebar/menu-items`**
**Responsabilidade:** Criar novo item (admin)

```typescript
export async function POST(request: NextRequest) {
  const data = await request.json()
  const userId = await getCurrentUser(request)
  
  const result = await pool.query(`
    INSERT INTO sidebar_menu_items (name, icon_name, url, resource, ...)
    VALUES ($1, $2, $3, $4, ...)
    RETURNING *
  `, [data.name, data.iconName, data.url, data.resource, ...])
  
  return NextResponse.json({ item: result.rows[0] })
}
```

---

## 📅 CRONOGRAMA DETALHADO

### **FASE 0: PREPARAÇÃO (Dia 1)**

#### **0.1 Backup Completo**
- ✅ Criar branch: `refactor/sidebar-permissions`
- ✅ Backup de database completo
- ✅ Backup de todos os arquivos afetados
- ✅ Documentar estado atual

#### **0.2 Criação de Scripts de Rollback**
- ✅ `rollback-sidebar.sh`: Reverter todos os arquivos
- ✅ `rollback-database.sh`: Restaurar database
- ✅ `check-integrity.sh`: Validar integridade pós-rollback

#### **0.3 Ambiente de Testes**
- ✅ Banco de dados de teste
- ✅ Usuários de teste (admin, corretor, usuario)
- ✅ Conjunto de testes automatizados

---

### **FASE 1: INFRAESTRUTURA (Dias 2-3)**

#### **1.1 Migração de Banco de Dados (Dia 2 - Manhã)**
**Tarefas:**
1. Criar tabelas novas (`sidebar_menu_items`, `sidebar_menu_versions`)
2. Popular `sidebar_menu_items` com dados atuais hardcoded
3. Criar índices
4. Testar performance

**Checkpoint:**
- ✅ Todos os dados atuais migrados
- ✅ Performance aceitável (< 100ms)

**Rollback Plan:**
- Se falhar: `DROP TABLE IF EXISTS sidebar_menu_items CASCADE`

---

#### **1.2 Componentes Base (Dia 2 - Tarde)**
**Tarefas:**
1. Criar `useSidebarMenu.ts` hook
2. Criar `DynamicIcon.tsx` component
3. Criar `PermissionValidator.ts` utility
4. Testes unitários

**Checkpoint:**
- ✅ Todos os componentes passam testes
- ✅ Cobertura de testes > 80%

**Rollback Plan:**
- Se falhar: Reverter commits

---

#### **1.3 APIs (Dia 3 - Manhã)**
**Tarefas:**
1. Implementar GET `/api/admin/sidebar/menu`
2. Implementar GET/POST/PUT/DELETE `/api/admin/sidebar/menu-items`
3. Documentar APIs
4. Testes de integração

**Checkpoint:**
- ✅ APIs retornam dados corretos
- ✅ Performance < 200ms

**Rollback Plan:**
- Se falhar: Remover arquivos de API

---

### **FASE 1.4: INTERFACE DE GERENCIAMENTO**

#### **Objetivo**
Criar interface administrativa completa para gerenciar a sidebar dinamicamente via interface web, permitindo configuração visual de menus, hierarquia e permissões.

#### **1.4.1 Página de Gerenciamento da Sidebar**

**Localização:** `/admin/configuracoes/sidebar`  
**Permissão:** Apenas Super Admin e Administrador

**Funcionalidades:**

1. **Visualização da Estrutura Hierárquica**
   - Árvore completa de menus (pais e filhos)
   - Drag & drop para reordenar
   - Preview em tempo real

2. **Gerenciamento de Menus Pai**
   - Criar/Editar/Deletar menu pai
   - Configurar nome, ícone, ordem
   - Ativar/desativar menu
   - Bloqueio: não permite deletar se tiver filhos

3. **Gerenciamento de Subitens**
   - Adicionar subitem a um menu pai
   - Editar/Reordenar subitens
   - Ativar/desativar subitem
   - Reordenar por drag & drop

4. **Configuração de Permissões**
   - Selecionar perfis com acesso (multi-select)
   - Associar funcionalidade (opcional)
   - Preview de permissões

5. **Seletor de Ícones**
   - Biblioteca visual de ícones Heroicons
   - Preview do ícone selecionado
   - Busca de ícones

#### **1.4.2 Modelo de Permissões Mantido**

**Sistema de Permissões:**

1. **Por Perfil (Role-Based Access Control - RBAC)**
   ```typescript
   // Perfis do sistema
   roles: ['Super Admin', 'Administrador', 'Corretor', 'Usuário']
   
   // Menu aparece apenas para perfis selecionados
   roles_required: ['Super Admin', 'Administrador']
   ```

2. **Por Funcionalidade (Feature-Based - Se aplicável)**
   ```typescript
   // Menu associado a uma funcionalidade específica
   feature_id: 123 // ID da funcionalidade
   permission_id: 456 // ID da permissão específica
   ```

3. **Ações CRUD/Execute (Por Funcionalidade)**
   ```typescript
   // Permissões definidas na tabela permissions
   {
     feature_id: 123,
     action: 'READ' | 'WRITE' | 'DELETE' | 'EXECUTE'
   }
   
   // Associação automática via role_permissions
   role → permission → feature
   ```

**Como Funciona:**

1. **Usuário faz login** com perfil específico
2. **Sistema busca menu** via `get_sidebar_menu_for_user(UUID)`
3. **Função filtra automaticamente:**
   - Verifica `roles_required` do menu
   - Verifica `permission_id` (se aplicável)
   - Retorna apenas menus permitidos
4. **Frontend renderiza** apenas o que o usuário pode ver

#### **1.4.3 Estrutura da Interface**

**Layout da Página:**

```typescript
// /admin/configuracoes/sidebar/page.tsx
export default function SidebarManagementPage() {
  return (
    <PermissionGuard resource="system-features" action="ADMIN">
      <div className="grid grid-cols-3 gap-6">
        {/* Coluna 1-2: Árvore de Menus */}
        <div className="col-span-2">
          <MenuTreeManager />
        </div>
        
        {/* Coluna 3: Preview */}
        <div className="col-span-1">
          <SidebarPreview />
        </div>
      </div>
    </PermissionGuard>
  );
}
```

**Componente: MenuTreeManager**

```typescript
// src/components/admin/SidebarManagement/MenuTreeManager.tsx
interface MenuTreeManagerProps {
  onMenuSelect?: (menuId: number) => void;
}

export function MenuTreeManager({ onMenuSelect }: MenuTreeManagerProps) {
  const { menus, loading, error, reload } = useSidebarItems();
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Estrutura da Sidebar</h2>
        <Button onClick={() => openCreateParentModal()}>
          Adicionar Menu Pai
        </Button>
      </div>
      
      {/* Árvore de Menus */}
      {menus.map(menu => (
        <MenuParent
          key={menu.id}
          menu={menu}
          onEdit={() => openEditModal(menu)}
          onDelete={() => handleDelete(menu.id)}
          onToggle={() => toggleActive(menu.id)}
        >
          {/* Subitens */}
          {menu.children.map(child => (
            <MenuChild
              key={child.id}
              child={child}
              onEdit={() => openEditModal(child)}
              onDelete={() => handleDelete(child.id)}
              onMoveUp={() => moveUp(child.id)}
              onMoveDown={() => moveDown(child.id)}
            />
          ))}
          
          {/* Botão para adicionar subitem */}
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => openCreateChildModal(menu.id)}
          >
            + Adicionar Subitem
          </Button>
        </MenuParent>
      ))}
      
      {/* Modal de Edição/Criação */}
      <MenuEditModal
        open={isModalOpen}
        menuItem={selectedMenu}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
}
```

**Componente: MenuEditModal**

```typescript
// src/components/admin/SidebarManagement/MenuEditModal.tsx
interface MenuEditModalProps {
  open: boolean;
  menuItem?: MenuItem | null;
  onClose: () => void;
  onSave: (data: MenuItemForm) => Promise<void>;
}

export function MenuEditModal({ open, menuItem, onClose, onSave }: MenuEditModalProps) {
  const form = useForm<MenuItemForm>();
  
  return (
    <Modal open={open} onClose={onClose} title={menuItem ? 'Editar Menu' : 'Novo Menu'}>
      <form onSubmit={form.handleSubmit(onSave)}>
        {/* Nome */}
        <FormField label="Nome do Menu *" error={form.formState.errors.name}>
          <Input
            {...form.register('name', { required: 'Nome é obrigatório' })}
            placeholder="Ex: Painel do Sistema"
          />
        </FormField>
        
        {/* Ícone */}
        <FormField label="Ícone *" error={form.formState.errors.icon_name}>
          <IconSelector
            selected={form.watch('icon_name')}
            onSelect={(icon) => form.setValue('icon_name', icon)}
          />
        </FormField>
        
        {/* URL (opcional) */}
        <FormField label="URL (opcional)" error={form.formState.errors.url}>
          <Input
            {...form.register('url')}
            placeholder="/admin/exemplo"
          />
        </FormField>
        
        {/* Descrição */}
        <FormField label="Descrição">
          <Textarea
            {...form.register('description')}
            rows={3}
            placeholder="Descrição opcional do menu"
          />
        </FormField>
        
        {/* Perfis com Acesso */}
        <FormField label="Perfis com Acesso *">
          <MultiSelect
            options={[
              { value: 'Super Admin', label: 'Super Admin' },
              { value: 'Administrador', label: 'Administrador' },
              { value: 'Corretor', label: 'Corretor' },
              { value: 'Usuário', label: 'Usuário' }
            ]}
            selected={form.watch('roles_required') || []}
            onChange={(roles) => form.setValue('roles_required', roles)}
          />
        </FormField>
        
        {/* Funcionalidade (opcional) */}
        <FormField label="Funcionalidade Associada">
          <FeatureSelector
            selected={form.watch('feature_id')}
            onSelect={(id) => form.setValue('feature_id', id)}
          />
        </FormField>
        
        {/* Ordem */}
        <FormField label="Ordem de Exibição">
          <NumberInput
            value={form.watch('order_index') || 0}
            onChange={(val) => form.setValue('order_index', val)}
            min={0}
          />
        </FormField>
        
        {/* Status */}
        <FormField label="Status">
          <Toggle
            checked={form.watch('is_active') !== false}
            onChange={(active) => form.setValue('is_active', active)}
            label={form.watch('is_active') ? 'Ativo' : 'Inativo'}
          />
        </FormField>
        
        {/* Botões */}
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit">
            Salvar
          </Button>
        </div>
      </form>
    </Modal>
  );
}
```

**Componente: IconSelector**

```typescript
// src/components/admin/SidebarManagement/IconSelector.tsx
const iconLibrary = [
  { name: 'home', label: 'Home', icon: HomeIcon },
  { name: 'building', label: 'Imóvel', icon: BuildingOfficeIcon },
  { name: 'users', label: 'Usuários', icon: UsersIcon },
  { name: 'shield', label: 'Segurança', icon: ShieldCheckIcon },
  { name: 'chart', label: 'Gráfico', icon: ChartBarIcon },
  { name: 'document', label: 'Documento', icon: DocumentTextIcon },
  { name: 'cog', label: 'Configuração', icon: CogIcon },
  { name: 'tag', label: 'Tag', icon: TagIcon },
  { name: 'map-pin', label: 'Localização', icon: MapPinIcon },
  { name: 'clock', label: 'Relógio', icon: ClockIcon },
  { name: 'wrench', label: 'Ferramenta', icon: WrenchScrewdriverIcon },
  { name: 'squares', label: 'Grade', icon: Squares2X2Icon },
  // ... mais ícones
];

interface IconSelectorProps {
  selected?: string;
  onSelect: (iconName: string) => void;
}

export function IconSelector({ selected, onSelect }: IconSelectorProps) {
  const [search, setSearch] = useState('');
  
  const filteredIcons = iconLibrary.filter(icon => 
    icon.label.toLowerCase().includes(search.toLowerCase())
  );
  
  return (
    <div className="space-y-3">
      {/* Search */}
      <Input
        placeholder="Buscar ícone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      
      {/* Grid de Ícones */}
      <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto">
        {filteredIcons.map(icon => {
          const IconComponent = icon.icon;
          const isSelected = selected === icon.name;
          
          return (
            <button
              key={icon.name}
              type="button"
              onClick={() => onSelect(icon.name)}
              className={`
                p-3 border-2 rounded-lg transition-colors
                ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}
              `}
              title={icon.label}
            >
              <IconComponent className="w-6 h-6 mx-auto text-gray-700" />
            </button>
          );
        })}
      </div>
      
      {/* Preview */}
      {selected && (
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
          <span className="text-sm text-gray-600">Ícone selecionado:</span>
          {iconLibrary.find(i => i.name === selected)?.label}
        </div>
      )}
    </div>
  );
}
```

**Componente: SidebarPreview**

```typescript
// src/components/admin/SidebarManagement/SidebarPreview.tsx
interface SidebarPreviewProps {
  menus: MenuItem[];
}

export function SidebarPreview({ menus }: SidebarPreviewProps) {
  return (
    <div className="sticky top-4">
      <div className="bg-white border rounded-lg shadow-sm">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900">Preview da Sidebar</h3>
        </div>
        
        <nav className="p-2">
          {menus
            .filter(menu => menu.is_active)
            .map(menu => (
              <div key={menu.id} className="mb-1">
                {/* Menu Pai */}
                <div className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded">
                  <DynamicIcon iconName={menu.icon_name} className="w-5 h-5 mr-3" />
                  <span>{menu.name}</span>
                </div>
                
                {/* Submenus */}
                {menu.children && menu.children.length > 0 && (
                  <div className="ml-8 space-y-1 mt-1">
                    {menu.children
                      .filter(child => child.is_active)
                      .map(child => (
                        <a
                          key={child.id}
                          href={child.url || '#'}
                          className="flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <DynamicIcon iconName={child.icon_name} className="w-4 h-4 mr-2" />
                          <span>{child.name}</span>
                        </a>
                      ))}
                  </div>
                )}
              </div>
            ))}
        </nav>
      </div>
    </div>
  );
}
```

#### **1.4.4 Arquivos a Criar**

1. `src/app/admin/configuracoes/sidebar/page.tsx` - Página principal
2. `src/components/admin/SidebarManagement/MenuTreeManager.tsx` - Gerenciador de árvore
3. `src/components/admin/SidebarManagement/MenuEditModal.tsx` - Modal de edição
4. `src/components/admin/SidebarManagement/IconSelector.tsx` - Seletor de ícones
5. `src/components/admin/SidebarManagement/SidebarPreview.tsx` - Preview
6. `src/components/admin/SidebarManagement/MenuParent.tsx` - Componente de menu pai
7. `src/components/admin/SidebarManagement/MenuChild.tsx` - Componente de submenu
8. `src/hooks/useSidebarItems.ts` - Hook para gerenciar itens

**Checkpoint:**
- ✅ Interface funcional e intuitiva
- ✅ CRUD completo de menus
- ✅ Validação de dados
- ✅ Preview em tempo real

**Rollback Plan:**
- Se falhar: Remover arquivos criados

---

### **FASE 2: REFATORAÇÃO (Dias 4-5)**

#### **2.1 Refatorar AdminSidebar.tsx (Dia 4 - Manhã)**
**Tarefas:**
1. Substituir `getMenuStructure()` por chamada ao hook
2. Remover hardcoding de roles
3. Usar `DynamicIcon` para ícones
4. Centralizar validação em `PermissionValidator`

**Riscos:**
- 🔴 **ALTO:** Pode quebrar visualização de sidebar
- 🔴 **ALTO:** Permissões podem não funcionar

**Testes Críticos:**
1. ✅ Sidebar renderiza corretamente
2. ✅ Todos os menus aparecem
3. ✅ Permissões funcionam corretamente
4. ✅ Links navegam corretamente

**Rollback Plan:**
- Se falhar: Reverter para versão anterior
- Commands: `git checkout HEAD~1 src/components/admin/AdminSidebar.tsx`

---

#### **2.2 Refatorar userPermissions.ts (Dia 4 - Tarde)**
**Tarefas:**
1. Remover `featureMapping` hardcoded
2. Buscar mapeamentos do banco de dados
3. Implementar cache de mapeamentos
4. Testes de performance

**Riscos:**
- 🟡 **MÉDIO:** Performance pode degradar
- 🟡 **MÉDIO:** Mapeamentos podem quebrar

**Testes Críticos:**
1. ✅ Mapeamentos funcionam corretamente
2. ✅ Performance < 50ms
3. ✅ Cache funciona

**Rollback Plan:**
- Se falhar: Restaurar `featureMapping` original

---

#### **2.3 Remover Hardcoding de Admin (Dia 5 - Manhã)**
**Tarefas:**
1. Criar role especial no banco: `admin-access-role`
2. Atribuir role ao usuário admin
3. Remover validação hardcoded
4. Usar `PermissionValidator.isAdmin()`

**Riscos:**
- 🔴 **CRÍTICO:** Admin pode perder acesso
- 🔴 **CRÍTICO:** Sistema pode ficar inacessível

**Testes Críticos:**
1. ✅ Admin consegue fazer login
2. ✅ Admin vê todos os menus
3. ✅ Admin tem acesso total
4. ✅ Outros usuários funcionam normal

**Rollback Plan:**
- Se falhar: Reverter commit IMEDIATAMENTE
- Command: `git revert HEAD`

---

### **FASE 3: TESTES E VALIDAÇÃO (Dia 6)**

#### **3.1 Testes Funcionais**
**Cenários:**
1. Login como admin → Verificar todos os menus
2. Login como corretor → Verificar menus limitados
3. Login como usuario → Verificar menus básicos
4. Adicionar novo menu via API → Verificar aparecer
5. Editar menu existente → Verificar mudanças
6. Desativar menu → Verificar desaparecer

**Critérios de Sucesso:**
- ✅ 100% dos cenários passam
- ✅ Nenhum erro no console
- ✅ Performance aceitável

---

#### **3.2 Testes de Performance**
**Métricas:**
- Tempo de carregamento de sidebar: < 200ms
- Tempo de resposta de API: < 100ms
- Uso de memória: < 50MB

**Critérios de Sucesso:**
- ✅ Todas as métricas dentro do esperado

---

#### **3.3 Testes de Segurança**
**Cenários:**
1. Tentar acessar menu não autorizado → Deve negar
2. Tentar modificar menu via API não autorizado → Deve negar
3. Verificar logs de auditoria → Deve registrar

**Critérios de Sucesso:**
- ✅ Nenhuma brecha de segurança

---

### **FASE 4: DEPLOY E MONITORAMENTO (Dia 7)**

#### **4.1 Deploy Gradual**
**Estratégia:**
1. Deploy para ambiente de staging
2. Testes completos em staging (2 horas)
3. Deploy para produção (manutenção programada)
4. Monitoramento intensivo (24 horas)

---

#### **4.2 Monitoramento**
**Métricas a Observar:**
- Taxa de erro (deve ser 0%)
- Tempo de resposta
- Logs de erro
- Feedback de usuários

**Cenário de Rollback:**
- Se taxa de erro > 5% → Rollback IMEDIATO

---

## 🛡️ PLANOS DE ROLLBACK DETALHADOS

### **Rollback de Banco de Dados**

```sql
-- 1. Backup antes de qualquer mudança
CREATE TABLE sidebar_menu_items_backup AS SELECT * FROM sidebar_menu_items;

-- 2. Rollback
DROP TABLE IF EXISTS sidebar_menu_items CASCADE;
DROP TABLE IF EXISTS sidebar_menu_versions CASCADE;

-- 3. Restaurar (se necessário)
CREATE TABLE sidebar_menu_items AS SELECT * FROM sidebar_menu_items_backup;
```

---

### **Rollback de Código**

```bash
# 1. Backup atual
git branch backup-before-refactor

# 2. Rollback para commit anterior
git checkout main
git reset --hard <commit-antes-da-refactor>

# 3. Force push (apenas se necessário)
git push -f origin main
```

---

### **Rollback de Features Específicas**

```typescript
// Config flag para habilitar/desabilitar refactor
const USE_DYNAMIC_SIDEBAR = process.env.USE_DYNAMIC_SIDEBAR === 'true'

export default function AdminSidebar() {
  if (USE_DYNAMIC_SIDEBAR) {
    return <DynamicSidebar />
  } else {
    return <StaticSidebar />
  }
}
```

---

## 📊 MÉTRICAS DE SUCESSO

### **KPIs Técnicos**
- ✅ Redução de hardcoding: 100%
- ✅ Tempo para adicionar menu: < 5 minutos
- ✅ Tempo de deploy: -50%
- ✅ Taxa de erro: < 0.1%

### **KPIs de Negócio**
- ✅ Custo de manutenção: -60%
- ✅ Tempo de resposta a mudanças: -80%
- ✅ Satisfação de usuários: Mantida ou melhorada

---

## ⚠️ RISCOS E MITIGAÇÕES

| Risco | Probabilidade | Impacto | Mitigação |
|-------|--------------|---------|-----------|
| Admin perder acesso | Baixa | Crítico | Rollback imediato + backup de credenciais |
| Performance degradar | Média | Alto | Cache + índices + testes de carga |
| Quebra de permissões | Alta | Crítico | Testes extensivos + feature flag |
| Erro em produção | Média | Alto | Deploy gradual + monitoramento |
| Perda de dados | Baixa | Crítico | Backup completo antes + transações |

---

## 🔄 CRONOGRAMA DE REVISÕES

### **Checkpoints Diários**
- ✅ Reunião de 15 min no início do dia
- ✅ Revisão de progresso no meio do dia
- ✅ Validação de testes no fim do dia

### **Checkpoints de Fase**
- ✅ Fase 0: Antes de iniciar (Dia 1 - Início)
- ✅ Fase 1: Após infraestrutura (Dia 3 - Fim)
- ✅ Fase 2: Após refatoração (Dia 5 - Fim)
- ✅ Fase 3: Após testes (Dia 6 - Fim)
- ✅ Fase 4: Após deploy (Dia 7 - Fim)

---

## 📝 CHECKLIST FINAL

### **Antes de Iniciar**
- [ ] Backup completo de banco de dados
- [ ] Backup de todos os arquivos afetados
- [ ] Ambiente de testes configurado
- [ ] Scripts de rollback criados
- [ ] Time disponível para testes
- [ ] Documentação atualizada

### **Durante Desenvolvimento**
- [ ] Commits frequentes e descritivos
- [ ] Testes a cada mudança significativa
- [ ] Validação em staging antes de produção
- [ ] Monitoramento contínuo

### **Pós-Deploy**
- [ ] Monitoramento por 48 horas
- [ ] Coleta de feedback de usuários
- [ ] Documentação atualizada
- [ ] Retrospectiva realizada
- [ ] Métricas de sucesso coletadas

---

## 📚 DOCUMENTAÇÃO ADICIONAL

### **Para Desenvolvedores**
- Como adicionar novo menu via banco
- Como criar novo ícone
- Como testar permissões

### **Para Administradores**
- Como gerenciar menus via interface
- Como criar versionamento de menu
- Como fazer rollback de menu

---

## ✅ CONCLUSÃO

Este plano de refatoração elimina 100% do hardcoding, tornando o sistema totalmente gerenciável via banco de dados. Com um plano de testes robusto, rollback detalhado e monitoramento intensivo, o risco é **controlado e mitigado**.

**Tempo Total Estimado:** 5-7 dias úteis  
**Probabilidade de Sucesso:** 95% (com mitigação de riscos)  
**ROI Esperado:** Redução de 60% no custo de manutenção

---

**Próximo Passo:** Aprovação do plano e início da Fase 0.
